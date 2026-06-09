import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTenantPublicScope,
  getTenantScope,
  tenantCacheKey,
  tenantCacheTag,
  withTenantId,
} from "@/lib/tenant/scope";
import {
  calculatePriceFromCatalog,
  getBuildingOptionPolicies,
  getRoomEnabledOptionIds,
  hasAcFromOptions,
  listRoomOptions,
  listRoomTypes,
  setRoomEnabledOptions,
} from "@/services/room-catalog";
import {
  buildBulkRoomNames,
  findDuplicateRoomNames,
  type BulkNamingMode,
} from "@/domain/room/bulk-names";
import { ROOM_LOCKING_BOOKING_STATUSES } from "@/domain/booking/room-guards";
import { legacyRoomTypeFromCatalogSlug } from "@/domain/room/legacy-room-type";
import type { Room } from "@/types/database";

async function countLockingBookingRooms(roomIds: string[]): Promise<number> {
  if (roomIds.length === 0) return 0;
  const { tenantId, supabase } = await getTenantScope();
  const { count, error } = await supabase
    .from("booking_rooms")
    .select("id, bookings!inner(status)", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("room_id", roomIds)
    .in("bookings.status", ROOM_LOCKING_BOOKING_STATUSES);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export type CreateRoomInput = {
  building_id: string;
  floor_id: string | null;
  name: string;
  room_type_definition_id: string | null;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  enabled_option_ids: string[];
  price_per_night: number;
  sort_order: number;
  building_default_price?: number;
};

async function requireBuildingInTenant(buildingId: string) {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("buildings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", buildingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("buildings.not_found");
  return { tenantId, supabase };
}

async function listAllRoomsUncached(tenantId: string): Promise<
  (Room & {
    building_name: string;
    floor_name: string | null;
    room_type_name: string | null;
  })[]
> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base,
      allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night,
      is_active, sort_order,
      buildings ( name ),
      floors ( name ),
      room_type_definitions ( name )
    `
    )
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const b = row.buildings as { name: string } | { name: string }[] | null;
    const f = row.floors as { name: string } | { name: string }[] | null;
    const t = row.room_type_definitions as
      | { name: string }
      | { name: string }[]
      | null;
    const typeName = Array.isArray(t) ? t[0]?.name : t?.name;
    return {
      id: row.id,
      building_id: row.building_id,
      floor_id: row.floor_id,
      name: row.name,
      room_type: row.room_type,
      capacity_base: row.capacity_base,
      allows_extra_beds: row.allows_extra_beds,
      max_extra_beds_per_room: row.max_extra_beds_per_room,
      has_ac: row.has_ac,
      price_per_night: Number(row.price_per_night),
      is_active: row.is_active,
      sort_order: row.sort_order,
      building_name: Array.isArray(b) ? b[0]?.name ?? "?" : b?.name ?? "?",
      floor_name: Array.isArray(f) ? f[0]?.name ?? null : f?.name ?? null,
      room_type_name: typeName ?? null,
    };
  });
}

const getCachedRooms = (tenantId: string) =>
  unstable_cache(
    () => listAllRoomsUncached(tenantId),
    tenantCacheKey(tenantId, CACHE_TAGS.rooms),
    {
      tags: [CACHE_TAGS.rooms, tenantCacheTag(tenantId, "rooms")],
      revalidate: 300,
    }
  );

const loadAllRoomsCached = cache((tenantId: string) => getCachedRooms(tenantId)());

/** Admin / staff — requires tenant host + membership. */
export async function listAllRooms(): Promise<
  (Room & {
    building_name: string;
    floor_name: string | null;
    room_type_name: string | null;
  })[]
> {
  const { tenantId } = await getTenantScope();
  return loadAllRoomsCached(tenantId);
}

type RoomWithJoins = Room & {
  building_name: string;
  floor_name: string | null;
  room_type_name: string | null;
};

function mapRoomRows(
  data: {
    id: string;
    building_id: string;
    floor_id: string | null;
    name: string;
    room_type: string;
    room_type_definition_id: string | null;
    capacity_base: number;
    allows_extra_beds: boolean;
    max_extra_beds_per_room: number;
    has_ac: boolean;
    price_per_night: number;
    is_active: boolean;
    sort_order: number;
    buildings: { name: string } | { name: string }[] | null;
    floors: { name: string } | { name: string }[] | null;
    room_type_definitions: { name: string } | { name: string }[] | null;
  }[]
): RoomWithJoins[] {
  return data.map((row) => {
    const b = row.buildings;
    const f = row.floors;
    const t = row.room_type_definitions;
    const typeName = Array.isArray(t) ? t[0]?.name : t?.name;
    return {
      id: row.id,
      building_id: row.building_id,
      floor_id: row.floor_id,
      name: row.name,
      room_type: row.room_type,
      capacity_base: row.capacity_base,
      allows_extra_beds: row.allows_extra_beds,
      max_extra_beds_per_room: row.max_extra_beds_per_room,
      has_ac: row.has_ac,
      price_per_night: Number(row.price_per_night),
      is_active: row.is_active,
      sort_order: row.sort_order,
      building_name: Array.isArray(b) ? b[0]?.name ?? "?" : b?.name ?? "?",
      floor_name: Array.isArray(f) ? f[0]?.name ?? null : f?.name ?? null,
      room_type_name: typeName ?? null,
    };
  });
}

const loadRoomsByIds = cache(async (idsKey: string): Promise<RoomWithJoins[]> => {
  const unique = [...new Set(idsKey.split(",").filter(Boolean))];
  if (unique.length === 0) return [];
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base,
      allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night,
      is_active, sort_order,
      buildings ( name ),
      floors ( name ),
      room_type_definitions ( name )
    `
    )
    .eq("tenant_id", tenantId)
    .in("id", unique);

  if (error) throw new Error(error.message);
  return mapRoomRows(data ?? []);
});

/** Specific rooms by id — single query, per-request cache. */
export async function getRoomsByIds(ids: string[]): Promise<RoomWithJoins[]> {
  const key = [...new Set(ids.filter(Boolean))].sort().join(",");
  return loadRoomsByIds(key);
}

const loadAllRoomsForPublic = cache((tenantId: string) =>
  getCachedRooms(tenantId)()
);

/** Public calendar preview — tenant from host only. */
export async function listAllRoomsForPublic(): Promise<
  (Room & {
    building_name: string;
    floor_name: string | null;
    room_type_name: string | null;
  })[]
> {
  const { tenantId } = await getTenantPublicScope();
  return loadAllRoomsForPublic(tenantId);
}

async function resolveRoomInsertFields(input: CreateRoomInput) {
  const [types, options, policies] = await Promise.all([
    listRoomTypes(),
    listRoomOptions(),
    getBuildingOptionPolicies(input.building_id),
  ]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

  const price =
    input.price_per_night > 0
      ? input.price_per_night
      : calculatePriceFromCatalog({
          type,
          buildingDefaultPrice: input.building_default_price ?? 0,
          options,
          policies,
          typeDefaultOptionIds: type?.default_option_ids ?? [],
          selectedOptionIds: input.enabled_option_ids,
        });

  const capacity = type?.capacity_base ?? input.capacity_base;
  const room_type = legacyRoomTypeFromCatalogSlug(type?.slug);
  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);

  return { type, price, capacity, room_type, has_ac, options };
}

type ResolvedRoomInsertFields = Awaited<ReturnType<typeof resolveRoomInsertFields>>;

async function insertRoomRow(
  tenantId: string,
  supabase: Awaited<ReturnType<typeof requireBuildingInTenant>>["supabase"],
  input: CreateRoomInput,
  fields: ResolvedRoomInsertFields
): Promise<{ id: string }> {
  const { type, price, capacity, room_type, has_ac } = fields;
  const { data, error } = await supabase
    .from("rooms")
    .insert(
      withTenantId(tenantId, {
        building_id: input.building_id,
        floor_id: input.floor_id || null,
        name: input.name.trim(),
        room_type,
        room_type_definition_id: type?.id ?? null,
        capacity_base: capacity,
        allows_extra_beds: input.allows_extra_beds,
        max_extra_beds_per_room: input.allows_extra_beds
          ? input.max_extra_beds_per_room
          : 0,
        has_ac,
        price_per_night: price,
        sort_order: input.sort_order,
        is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await setRoomEnabledOptions(data.id, input.enabled_option_ids);
  return { id: data.id };
}

async function assertFloorInBuilding(
  buildingId: string,
  floorId: string | null
): Promise<void> {
  if (!floorId) return;
  const { tenantId, supabase } = await requireBuildingInTenant(buildingId);
  const { data, error } = await supabase
    .from("floors")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", floorId)
    .eq("building_id", buildingId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("floors.building_mismatch");
}

async function assertRoomNameAvailable(
  buildingId: string,
  floorId: string | null,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("rooms.name_required");
  const existing = await listRoomNamesInScope(buildingId, floorId);
  const conflicts = findDuplicateRoomNames(existing, [trimmed]);
  if (conflicts.length > 0) {
    throw new Error(`rooms.duplicate_name:${trimmed}`);
  }
}

export async function createRoom(input: CreateRoomInput): Promise<{ id: string }> {
  const [fields, { tenantId, supabase }] = await Promise.all([
    Promise.all([
      resolveRoomInsertFields(input),
      assertFloorInBuilding(input.building_id, input.floor_id),
      assertRoomNameAvailable(input.building_id, input.floor_id, input.name),
    ]).then(([resolved]) => resolved),
    requireBuildingInTenant(input.building_id),
  ]);

  return insertRoomRow(tenantId, supabase, input, fields);
}

const loadRoomNamesInScope = cache(async (
  buildingId: string,
  floorId: string | null
): Promise<string[]> => {
  const { tenantId, supabase } = await getTenantScope();
  let query = supabase
    .from("rooms")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("building_id", buildingId);
  if (floorId) {
    query = query.eq("floor_id", floorId);
  } else {
    query = query.is("floor_id", null);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.name));
});

/** Nume camere în același scope: clădire + etaj (null = fără etaj). */
export async function listRoomNamesInScope(
  buildingId: string,
  floorId: string | null
): Promise<string[]> {
  return loadRoomNamesInScope(buildingId, floorId);
}

/** @deprecated Folosește listRoomNamesInScope — păstrat pentru compatibilitate. */
export async function listRoomNamesInBuilding(buildingId: string): Promise<string[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select("name")
    .eq("tenant_id", tenantId)
    .eq("building_id", buildingId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => String(row.name));
}

export async function createRoomsBulk(input: {
  building_id: string;
  floor_id: string | null;
  room_type_definition_id: string;
  count: number;
  name_prefix: string;
  start_number: number;
  naming_mode: BulkNamingMode;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  enabled_option_ids: string[];
  price_per_night: number;
  sort_order_start: number;
  building_default_price?: number;
}): Promise<{ ids: string[] }> {
  if (input.count < 1 || input.count > 50) {
    throw new Error("rooms.bulk_count_must_be_between_1_and_50");
  }

  const proposedNames = buildBulkRoomNames(
    input.naming_mode,
    input.name_prefix,
    input.start_number,
    input.count
  );
  if (proposedNames.length !== input.count) {
    throw new Error("rooms.bulk_invalid_names");
  }

  const [, existing] = await Promise.all([
    assertFloorInBuilding(input.building_id, input.floor_id),
    listRoomNamesInScope(input.building_id, input.floor_id),
  ]);
  const conflicts = findDuplicateRoomNames(existing, proposedNames);
  if (conflicts.length > 0) {
    throw new Error(
      `rooms.bulk_duplicate_names:${conflicts.slice(0, 12).join("|")}`
    );
  }

  const templateInput: CreateRoomInput = {
    building_id: input.building_id,
    floor_id: input.floor_id,
    name: proposedNames[0]!,
    room_type_definition_id: input.room_type_definition_id,
    capacity_base: 2,
    allows_extra_beds: input.allows_extra_beds,
    max_extra_beds_per_room: input.max_extra_beds_per_room,
    enabled_option_ids: input.enabled_option_ids,
    price_per_night: input.price_per_night,
    sort_order: input.sort_order_start,
    building_default_price: input.building_default_price,
  };

  const [fields, { tenantId, supabase }] = await Promise.all([
    resolveRoomInsertFields(templateInput),
    requireBuildingInTenant(input.building_id),
  ]);

  const ids: string[] = [];
  for (let i = 0; i < input.count; i++) {
    const name = proposedNames[i]!;
    const room = await insertRoomRow(
      tenantId,
      supabase,
      {
        ...templateInput,
        name,
        sort_order: input.sort_order_start + i,
      },
      fields
    );
    ids.push(room.id);
  }
  return { ids };
}

const loadRoomById = cache(async (id: string) => {
  const scopePromise = getTenantScope();
  const [{ data, error }, enabled_option_ids] = await Promise.all([
    scopePromise.then(({ tenantId, supabase }) =>
      supabase
        .from("rooms")
        .select(
          "id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base, allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night, is_active, sort_order, buildings ( ac_mode )"
        )
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .single()
    ),
    getRoomEnabledOptionIds(id),
  ]);

  if (error) throw new Error(error.message);
  const b = data.buildings as { ac_mode: string } | { ac_mode: string }[] | null;
  const ac_mode = Array.isArray(b) ? b[0]?.ac_mode : b?.ac_mode;

  return {
    ...data,
    building_ac_mode: ac_mode ?? "per_room",
    enabled_option_ids,
  };
});

export async function getRoomById(id: string) {
  return loadRoomById(id);
}

export async function updateRoom(
  id: string,
  input: {
    building_id: string;
    floor_id: string | null;
    name: string;
    room_type_definition_id: string | null;
    capacity_base: number;
    allows_extra_beds: boolean;
    max_extra_beds_per_room: number;
    enabled_option_ids: string[];
    price_per_night: number;
    sort_order: number;
    is_active: boolean;
    building_default_price?: number;
  }
): Promise<void> {
  const [[types, options, policies], { tenantId, supabase }] = await Promise.all([
    Promise.all([
      listRoomTypes(),
      listRoomOptions(),
      getBuildingOptionPolicies(input.building_id),
    ]),
    getTenantScope(),
  ]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

  const price =
    input.price_per_night > 0
      ? input.price_per_night
      : calculatePriceFromCatalog({
          type,
          buildingDefaultPrice: input.building_default_price ?? 0,
          options,
          policies,
          typeDefaultOptionIds: type?.default_option_ids ?? [],
          selectedOptionIds: input.enabled_option_ids,
        });

  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);
  const capacity = type?.capacity_base ?? input.capacity_base;
  const room_type = legacyRoomTypeFromCatalogSlug(type?.slug);
  const { error } = await supabase
    .from("rooms")
    .update({
      building_id: input.building_id,
      floor_id: input.floor_id || null,
      name: input.name.trim(),
      room_type,
      room_type_definition_id: type?.id ?? null,
      capacity_base: capacity,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.allows_extra_beds
        ? input.max_extra_beds_per_room
        : 0,
      has_ac,
      price_per_night: price,
      sort_order: input.sort_order,
      is_active: input.is_active,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) throw new Error(error.message);
  await setRoomEnabledOptions(id, input.enabled_option_ids);
}

export async function assignRoomToFloor(
  roomId: string,
  floorId: string | null
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id, building_id")
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .maybeSingle();
  if (roomErr) throw new Error(roomErr.message);
  if (!room) throw new Error("rooms.not_found");

  if (floorId) {
    const { data: floor, error: floorErr } = await supabase
      .from("floors")
      .select("id, building_id")
      .eq("tenant_id", tenantId)
      .eq("id", floorId)
      .eq("is_active", true)
      .maybeSingle();
    if (floorErr) throw new Error(floorErr.message);
    if (!floor || floor.building_id !== room.building_id) {
      throw new Error("floors.building_mismatch");
    }
  }

  const { error } = await supabase
    .from("rooms")
    .update({ floor_id: floorId })
    .eq("tenant_id", tenantId)
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function setRoomActive(
  id: string,
  is_active: boolean
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("rooms")
    .update({ is_active })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRoom(id: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const lockingCount = await countLockingBookingRooms([id]);
  if (lockingCount > 0) {
    throw new Error(
      "rooms.cannot_delete_room_with_bookings_disable_instead"
    );
  }

  await setRoomEnabledOptions(id, []);
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

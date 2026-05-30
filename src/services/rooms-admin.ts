import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTenantScope,
  tenantCacheKey,
  tenantCacheTag,
  withTenantId,
} from "@/lib/tenant/scope";
import {
  calculatePriceFromCatalog,
  getRoomEnabledOptionIds,
  hasAcFromOptions,
  listRoomOptions,
  listRoomTypes,
  setRoomEnabledOptions,
} from "@/services/room-catalog";
import type { Room } from "@/types/database";

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
  const { supabase } = await getTenantScope();
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

export async function listAllRooms(): Promise<
  (Room & {
    building_name: string;
    floor_name: string | null;
    room_type_name: string | null;
  })[]
> {
  const { tenantId } = await getTenantScope();
  return getCachedRooms(tenantId)();
}

async function resolveRoomInsertFields(input: CreateRoomInput) {
  const [types, options] = await Promise.all([listRoomTypes(), listRoomOptions()]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

  const policies = await import("@/services/room-catalog").then((m) =>
    m.getBuildingOptionPolicies(input.building_id)
  );

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
  const room_type = type?.slug ?? "double";
  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);

  return { type, price, capacity, room_type, has_ac, options };
}

export async function createRoom(input: CreateRoomInput): Promise<{ id: string }> {
  const { type, price, capacity, room_type, has_ac } =
    await resolveRoomInsertFields(input);

  const { tenantId, supabase } = await requireBuildingInTenant(input.building_id);
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

export async function createRoomsBulk(input: {
  building_id: string;
  floor_id: string | null;
  room_type_definition_id: string;
  count: number;
  name_prefix: string;
  start_number: number;
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

  const ids: string[] = [];
  for (let i = 0; i < input.count; i++) {
    const num = input.start_number + i;
    const name = `${input.name_prefix}${num}`.trim();
    const room = await createRoom({
      building_id: input.building_id,
      floor_id: input.floor_id,
      name,
      room_type_definition_id: input.room_type_definition_id,
      capacity_base: 2,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.max_extra_beds_per_room,
      enabled_option_ids: input.enabled_option_ids,
      price_per_night: input.price_per_night,
      sort_order: input.sort_order_start + i,
      building_default_price: input.building_default_price,
    });
    ids.push(room.id);
  }
  return { ids };
}

export async function getRoomById(id: string) {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, building_id, floor_id, name, room_type, room_type_definition_id, capacity_base, allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night, is_active, sort_order, buildings ( ac_mode )"
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  const b = data.buildings as { ac_mode: string } | { ac_mode: string }[] | null;
  const ac_mode = Array.isArray(b) ? b[0]?.ac_mode : b?.ac_mode;
  const enabled_option_ids = await getRoomEnabledOptionIds(id);

  return {
    ...data,
    building_ac_mode: ac_mode ?? "per_room",
    enabled_option_ids,
  };
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
  const [types, options] = await Promise.all([listRoomTypes(), listRoomOptions()]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;
  const policies = await import("@/services/room-catalog").then((m) =>
    m.getBuildingOptionPolicies(input.building_id)
  );

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
  const room_type = type?.slug ?? "double";

  const { tenantId, supabase } = await getTenantScope();
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

export async function deleteRoom(id: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const { count, error: brErr } = await supabase
    .from("booking_rooms")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("room_id", id);

  if (brErr) throw new Error(brErr.message);
  if ((count ?? 0) > 0) {
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

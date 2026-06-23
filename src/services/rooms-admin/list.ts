import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTenantPublicScope,
  getTenantScope,
  tenantCacheKey,
  tenantCacheTag,
} from "@/lib/tenant/scope";
import { getRoomEnabledOptionIds } from "@/services/room-catalog";
import type { Room } from "@/types/database";

import { mapRoomRows, type RoomWithJoins } from "./shared";

async function listAllRoomsUncached(tenantId: string): Promise<RoomWithJoins[]> {
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
export async function listAllRooms(): Promise<RoomWithJoins[]> {
  const { tenantId } = await getTenantScope();
  return loadAllRoomsCached(tenantId);
}

/** Tenant-scoped room list for internal services that already resolved tenantId. */
export async function listAllRoomsForTenant(tenantId: string): Promise<RoomWithJoins[]> {
  return loadAllRoomsCached(tenantId);
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

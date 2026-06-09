import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";

/** Rând din tabela `rooms` + nume clădire (join simplu) */
export type RoomRow = {
  id: string;
  name: string;
  room_type: string;
  capacity_base: number;
  has_ac: boolean;
  price_per_night: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  building_name: string | null;
};

async function listActiveRoomsUncached(tenantId: string): Promise<{
  rooms: RoomRow[];
  error: string | null;
}> {
  const supabase = createPublicAdminClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id,
      name,
      room_type,
      capacity_base,
      has_ac,
      price_per_night,
      allows_extra_beds,
      max_extra_beds_per_room,
      buildings ( name )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return { rooms: [], error: error.message };
  }

  const rooms: RoomRow[] = (data ?? []).map((row) => {
    const building = row.buildings as { name: string } | { name: string }[] | null;
    const buildingName = Array.isArray(building)
      ? building[0]?.name ?? null
      : building?.name ?? null;

    return {
      id: row.id,
      name: row.name,
      room_type: row.room_type,
      capacity_base: row.capacity_base,
      has_ac: row.has_ac,
      price_per_night: Number(row.price_per_night),
      allows_extra_beds: row.allows_extra_beds,
      max_extra_beds_per_room: row.max_extra_beds_per_room,
      building_name: buildingName,
    };
  });

  return { rooms, error: null };
}

const getCachedActiveRooms = (tenantId: string) =>
  unstable_cache(
    () => listActiveRoomsUncached(tenantId),
    ["active-rooms", tenantId],
    {
      tags: [CACHE_TAGS.rooms, tenantTag(tenantId, CACHE_TAGS.rooms)],
      revalidate: 300,
    }
  );

const loadActiveRooms = cache((tenantId: string) =>
  getCachedActiveRooms(tenantId)()
);

/**
 * Citește camerele active pentru tenant-ul curent (subdomeniu).
 * Per-request dedupe + 5min cross-request cache (busted via rooms tag).
 */
export async function listActiveRooms(): Promise<{
  rooms: RoomRow[];
  error: string | null;
}> {
  const { tenantId } = await getTenantScope();
  return loadActiveRooms(tenantId);
}

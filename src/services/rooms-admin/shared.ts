import { ROOM_LOCKING_BOOKING_STATUSES } from "@/domain/booking/room-guards";
import { getTenantScope } from "@/lib/tenant/scope";
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

export type RoomWithJoins = Room & {
  building_name: string;
  floor_name: string | null;
  room_type_name: string | null;
};

export async function countLockingBookingRooms(roomIds: string[]): Promise<number> {
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

export async function requireBuildingInTenant(buildingId: string) {
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

export function mapRoomRows(
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

export async function assertFloorInBuilding(
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

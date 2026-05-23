import { createAdminClient } from "@/lib/supabase/admin";
import type { Room } from "@/types/database";

export async function listAllRooms(): Promise<
  (Room & { building_name: string; floor_name: string | null })[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      id, building_id, floor_id, name, room_type, capacity_base,
      allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night,
      is_active, sort_order,
      buildings ( name ),
      floors ( name )
    `
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const b = row.buildings as { name: string } | { name: string }[] | null;
    const f = row.floors as { name: string } | { name: string }[] | null;
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
    };
  });
}

export async function createRoom(input: {
  building_id: string;
  floor_id: string | null;
  name: string;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  has_ac: boolean;
  price_per_night: number;
  sort_order: number;
}): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      building_id: input.building_id,
      floor_id: input.floor_id || null,
      name: input.name.trim(),
      room_type: "double",
      capacity_base: input.capacity_base,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.allows_extra_beds
        ? input.max_extra_beds_per_room
        : 0,
      has_ac: input.has_ac,
      price_per_night: input.price_per_night,
      sort_order: input.sort_order,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function getRoomById(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rooms")
    .select(
      "id, building_id, floor_id, name, room_type, capacity_base, allows_extra_beds, max_extra_beds_per_room, has_ac, price_per_night, is_active, sort_order, buildings ( ac_mode )"
    )
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  const b = data.buildings as { ac_mode: string } | { ac_mode: string }[] | null;
  const ac_mode = Array.isArray(b) ? b[0]?.ac_mode : b?.ac_mode;

  return { ...data, building_ac_mode: ac_mode ?? "per_room" };
}

export async function updateRoom(
  id: string,
  input: {
    building_id: string;
    floor_id: string | null;
    name: string;
    capacity_base: number;
    allows_extra_beds: boolean;
    max_extra_beds_per_room: number;
    has_ac: boolean;
    price_per_night: number;
    sort_order: number;
    is_active: boolean;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("rooms")
    .update({
      building_id: input.building_id,
      floor_id: input.floor_id || null,
      name: input.name.trim(),
      capacity_base: input.capacity_base,
      allows_extra_beds: input.allows_extra_beds,
      max_extra_beds_per_room: input.allows_extra_beds
        ? input.max_extra_beds_per_room
        : 0,
      has_ac: input.has_ac,
      price_per_night: input.price_per_night,
      sort_order: input.sort_order,
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteRoom(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { count, error: brErr } = await supabase
    .from("booking_rooms")
    .select("id", { count: "exact", head: true })
    .eq("room_id", id);

  if (brErr) throw new Error(brErr.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Camera apare în rezervări. Dezactiveaz-o din Edit în loc să o ștergi."
    );
  }

  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

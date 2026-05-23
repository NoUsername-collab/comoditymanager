import { createClient } from "@/lib/supabase/server";

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

/**
 * Citește camerele active din Supabase.
 * `services/` = „telefonul” către baza de date (nu reguli business).
 */
export async function listActiveRooms(): Promise<{
  rooms: RoomRow[];
  error: string | null;
}> {
  const supabase = await createClient();

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

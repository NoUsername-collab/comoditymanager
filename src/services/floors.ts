import { createAdminClient } from "@/lib/supabase/admin";
import type { Floor } from "@/types/database";

export async function listFloorsByBuilding(buildingId: string): Promise<Floor[]> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("floors")
    .select("id, building_id, name, level_number, sort_order, is_active")
    .eq("building_id", buildingId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Floor[];
}

export async function createFloor(input: {
  building_id: string;
  name: string;
  level_number: number | null;
  sort_order: number;
}): Promise<{ id: string }> {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("floors")
    .insert({
      building_id: input.building_id,
      name: input.name.trim(),
      level_number: input.level_number,
      sort_order: input.sort_order,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { AcMode, Building } from "@/types/database";

async function listBuildingsUncached(): Promise<Building[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, sort_order, color_hex, ac_mode, is_active, default_price_per_night")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as Building),
    default_price_per_night: Number(
      (row as { default_price_per_night?: number }).default_price_per_night ?? 0
    ),
  }));
}

const getCachedBuildings = unstable_cache(listBuildingsUncached, undefined, {
  tags: [CACHE_TAGS.buildings],
  revalidate: 300,
});

export async function listBuildings(): Promise<Building[]> {
  return getCachedBuildings();
}

export async function updateBuildingDefaultPrice(
  buildingId: string,
  default_price_per_night: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("buildings")
    .update({ default_price_per_night: Math.max(0, default_price_per_night) })
    .eq("id", buildingId);
  if (error) throw new Error(error.message);
}

export async function createBuilding(input: {
  name: string;
  sort_order: number;
  color_hex: string | null;
  ac_mode: AcMode;
  default_price_per_night?: number;
}): Promise<{ id: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buildings")
    .insert({
      name: input.name.trim(),
      sort_order: input.sort_order,
      color_hex: input.color_hex || null,
      ac_mode: input.ac_mode,
      default_price_per_night: input.default_price_per_night ?? 0,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteBuilding(id: string): Promise<void> {
  const supabase = createAdminClient();

  const { count: roomCount, error: roomErr } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("building_id", id);

  if (roomErr) throw new Error(roomErr.message);
  if ((roomCount ?? 0) > 0) {
    throw new Error(
      "Șterge mai întâi toate camerele din clădire (sau dezactivează-le)."
    );
  }

  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function defaultHasAcForBuilding(acMode: AcMode): boolean {
  if (acMode === "all_rooms") return true;
  if (acMode === "none") return false;
  return false;
}

import {
  getTenantScope,
  withTenantId,
} from "@/lib/tenant/scope";
import type { Floor } from "@/types/database";

async function requireBuildingInTenant(
  buildingId: string
): Promise<{ tenantId: string; supabase: Awaited<ReturnType<typeof getTenantScope>>["supabase"] }> {
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

export async function listFloorsByBuilding(buildingId: string): Promise<Floor[]> {
  const { tenantId, supabase } = await requireBuildingInTenant(buildingId);
  const { data, error } = await supabase
    .from("floors")
    .select("id, building_id, name, level_number, sort_order, is_active")
    .eq("tenant_id", tenantId)
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
  const { tenantId, supabase } = await requireBuildingInTenant(input.building_id);
  const { data, error } = await supabase
    .from("floors")
    .insert(
      withTenantId(tenantId, {
        building_id: input.building_id,
        name: input.name.trim(),
        level_number: input.level_number,
        sort_order: input.sort_order,
        is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

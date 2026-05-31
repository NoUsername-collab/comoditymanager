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

export async function findFloorByNameInBuilding(
  buildingId: string,
  name: string,
  excludeFloorId?: string
): Promise<{ id: string } | null> {
  const { tenantId, supabase } = await requireBuildingInTenant(buildingId);
  const normalized = name.trim();
  let query = supabase
    .from("floors")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("building_id", buildingId)
    .eq("is_active", true)
    .ilike("name", normalized);
  if (excludeFloorId) {
    query = query.neq("id", excludeFloorId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { id: data.id } : null;
}

export async function countRoomsOnFloor(floorId: string): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const { count, error } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("floor_id", floorId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function updateFloor(input: {
  floor_id: string;
  name: string;
  level_number: number | null;
  sort_order: number;
}): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { data: row, error: loadErr } = await supabase
    .from("floors")
    .select("id, building_id")
    .eq("tenant_id", tenantId)
    .eq("id", input.floor_id)
    .eq("is_active", true)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!row) throw new Error("floors.not_found");

  const duplicate = await findFloorByNameInBuilding(
    row.building_id,
    input.name,
    input.floor_id
  );
  if (duplicate) throw new Error("floors.duplicate_name");

  const { error } = await supabase
    .from("floors")
    .update({
      name: input.name.trim(),
      level_number: input.level_number,
      sort_order: input.sort_order,
    })
    .eq("tenant_id", tenantId)
    .eq("id", input.floor_id);
  if (error) throw new Error(error.message);
}

/** Șterge etajul; camerele rămân în clădire, fără etaj (FK on delete set null). */
export async function deleteFloor(floorId: string): Promise<{ roomsUnassigned: number }> {
  const { tenantId, supabase } = await getTenantScope();
  const roomCount = await countRoomsOnFloor(floorId);

  const { error } = await supabase
    .from("floors")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", floorId);
  if (error) throw new Error(error.message);

  return { roomsUnassigned: roomCount };
}

export async function createFloor(input: {
  building_id: string;
  name: string;
  level_number: number | null;
  sort_order: number;
}): Promise<{ id: string }> {
  const existing = await findFloorByNameInBuilding(input.building_id, input.name);
  if (existing) {
    throw new Error("floors.duplicate_name");
  }

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

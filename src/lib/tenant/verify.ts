import type { SupabaseClient } from "@supabase/supabase-js";

/** Ensures a building belongs to the active tenant before child operations. */
export async function requireBuildingInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  buildingId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", buildingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("building.not_found");
}

/** Ensures a room belongs to the active tenant. */
export async function requireRoomInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  roomId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("rooms.not_found");
}

/** Ensures all room IDs belong to the active tenant. */
export async function requireRoomsInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  roomIds: string[]
): Promise<void> {
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) return;

  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", unique);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== unique.length) {
    throw new Error("rooms.not_found");
  }
}

/** Ensures a room type definition belongs to the active tenant. */
export async function requireRoomTypeInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  typeId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("room_type_definitions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", typeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("room_catalog.type_not_found");
}

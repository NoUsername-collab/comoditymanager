import { ROOM_LOCKING_BOOKING_STATUSES } from "@/domain/booking/room-guards";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import type { AcMode, Building } from "@/types/database";

async function listBuildingsUncached(tenantId: string): Promise<Building[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, sort_order, color_hex, ac_mode, is_active, default_price_per_night")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...(row as Building),
    default_price_per_night: Number(
      (row as { default_price_per_night?: number }).default_price_per_night ?? 0
    ),
  }));
}

const getCachedBuildings = (tenantId: string) =>
  unstable_cache(
    () => listBuildingsUncached(tenantId),
    ["buildings", tenantId],
    {
      tags: [CACHE_TAGS.buildings, `tenant-${tenantId}-buildings`],
      revalidate: 300,
    }
  );

const loadBuildings = cache((tenantId: string) => getCachedBuildings(tenantId)());

export async function listBuildings(): Promise<Building[]> {
  const { tenantId } = await getTenantScope();
  return loadBuildings(tenantId);
}

const loadBuildingColorHex = cache(async (buildingId: string): Promise<string | null> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("buildings")
    .select("color_hex")
    .eq("tenant_id", tenantId)
    .eq("id", buildingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.color_hex as string | null) ?? null;
});

/** Single-column fetch — avoids loading all buildings on edit save. */
export async function getBuildingColorHex(buildingId: string): Promise<string | null> {
  if (!buildingId) return null;
  return loadBuildingColorHex(buildingId);
}

const loadBuildingDefaultPrice = cache(async (buildingId: string): Promise<number> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("buildings")
    .select("default_price_per_night")
    .eq("tenant_id", tenantId)
    .eq("id", buildingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Number(
    (data as { default_price_per_night?: number } | null)?.default_price_per_night ?? 0
  );
});

/** Single-column fetch for room pricing — avoids listBuildings() in actions. */
export async function getBuildingDefaultPrice(buildingId: string): Promise<number> {
  if (!buildingId) return 0;
  return loadBuildingDefaultPrice(buildingId);
}

const loadBuildingById = cache(async (buildingId: string): Promise<Building | null> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("buildings")
    .select("id, name, sort_order, color_hex, ac_mode, is_active, default_price_per_night")
    .eq("tenant_id", tenantId)
    .eq("id", buildingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...(data as Building),
    default_price_per_night: Number(
      (data as { default_price_per_night?: number }).default_price_per_night ?? 0
    ),
  };
});

/** Single-row fetch — avoids listBuildings() when only one building is needed. */
export async function getBuildingById(buildingId: string): Promise<Building | null> {
  if (!buildingId) return null;
  return loadBuildingById(buildingId);
}

export async function updateBuilding(input: {
  id: string;
  name: string;
  sort_order: number;
  ac_mode: AcMode;
  color_hex: string | null;
  default_price_per_night: number;
}): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("buildings")
    .update({
      name: input.name.trim(),
      sort_order: input.sort_order,
      ac_mode: input.ac_mode,
      color_hex: input.color_hex || null,
      default_price_per_night: Math.max(0, input.default_price_per_night),
    })
    .eq("tenant_id", tenantId)
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

export async function updateBuildingDefaultPrice(
  buildingId: string,
  default_price_per_night: number
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("buildings")
    .update({ default_price_per_night: Math.max(0, default_price_per_night) })
    .eq("tenant_id", tenantId)
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
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("buildings")
    .insert(
      withTenantId(tenantId, {
      name: input.name.trim(),
      sort_order: input.sort_order,
      color_hex: input.color_hex || null,
      ac_mode: input.ac_mode,
      default_price_per_night: input.default_price_per_night ?? 0,
      is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteBuilding(id: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();

  const { data: rooms, error: roomErr } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("building_id", id);

  if (roomErr) throw new Error(roomErr.message);

  const roomIds = (rooms ?? []).map((r) => r.id);
  if (roomIds.length > 0) {
    const { count: bookingCount, error: brErr } = await supabase
      .from("booking_rooms")
      .select("id, bookings!inner(status)", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("room_id", roomIds)
      .in("bookings.status", ROOM_LOCKING_BOOKING_STATUSES);

    if (brErr) throw new Error(brErr.message);
    if ((bookingCount ?? 0) > 0) {
      throw new Error("buildings.delete_rooms_have_bookings");
    }
    throw new Error("buildings.delete_all_rooms_or_disable_them_first");
  }

  const { error } = await supabase
    .from("buildings")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function defaultHasAcForBuilding(acMode: AcMode): boolean {
  if (acMode === "all_rooms") return true;
  if (acMode === "none") return false;
  return false;
}

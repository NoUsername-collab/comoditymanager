import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTenantScope,
  tenantCacheKey,
  tenantCacheTag,
  withTenantId,
} from "@/lib/tenant/scope";
import {
  acModeToPolicyMode,
  computeRoomPrice,
  policyModeForOption,
  resolveOptionEnabled,
  slugifyCatalogName,
} from "@/lib/room-catalog-pricing";
import type { AcMode } from "@/types/database";
import type {
  BuildingOptionPolicy,
  OptionPolicyMode,
  RoomCatalogContext,
  RoomOptionDefinition,
  RoomTypeDefinition,
} from "@/types/room-catalog";

function mapType(row: Record<string, unknown>, defaultIds: string[] = []): RoomTypeDefinition {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    capacity_base: Number(row.capacity_base),
    base_price_per_night: Number(row.base_price_per_night ?? 0),
    sort_order: Number(row.sort_order ?? 0),
    is_system: Boolean(row.is_system),
    is_active: Boolean(row.is_active),
    default_option_ids: defaultIds,
  };
}

function mapOption(row: Record<string, unknown>): RoomOptionDefinition {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: row.description != null ? String(row.description) : null,
    price_per_night_addon: Number(row.price_per_night_addon ?? 0),
    sort_order: Number(row.sort_order ?? 0),
    is_system: Boolean(row.is_system),
    is_active: Boolean(row.is_active),
  };
}

async function requireBuildingInTenant(
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
  if (!data) throw new Error("buildings.not_found");
}

async function requireRoomInTenant(
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

async function requireRoomTypeInTenant(
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
  if (!data) throw new Error("room_type.not_found");
}

async function listRoomTypesUncached(
  tenantId: string,
  includeInactive = false
): Promise<RoomTypeDefinition[]> {
  const supabase = createPublicAdminClient();
  let q = supabase
    .from("room_type_definitions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const typeIds = (data ?? []).map((row) => String(row.id));
  const { data: defaults, error: dErr } = await supabase
    .from("room_type_default_options")
    .select("room_type_id, option_id")
    .in("room_type_id", typeIds.length > 0 ? typeIds : ["00000000-0000-0000-0000-000000000000"]);
  if (dErr) throw new Error(dErr.message);

  const byType = new Map<string, string[]>();
  for (const row of defaults ?? []) {
    const tid = String(row.room_type_id);
    if (!typeIds.includes(tid)) continue;
    const list = byType.get(tid) ?? [];
    list.push(String(row.option_id));
    byType.set(tid, list);
  }

  return (data ?? []).map((row) =>
    mapType(row as Record<string, unknown>, byType.get(String(row.id)) ?? [])
  );
}

const getCachedRoomTypes = (tenantId: string, includeInactive: boolean) =>
  unstable_cache(
    () => listRoomTypesUncached(tenantId, includeInactive),
    tenantCacheKey(tenantId, CACHE_TAGS.roomCatalog, "types", String(includeInactive)),
    {
      tags: [CACHE_TAGS.roomCatalog, tenantCacheTag(tenantId, "room-catalog")],
      revalidate: 300,
    }
  );

export async function listRoomTypes(includeInactive = false): Promise<RoomTypeDefinition[]> {
  const { tenantId } = await getTenantScope();
  return getCachedRoomTypes(tenantId, includeInactive)();
}

async function listRoomOptionsUncached(
  tenantId: string,
  includeInactive = false
): Promise<RoomOptionDefinition[]> {
  const supabase = createPublicAdminClient();
  let q = supabase
    .from("room_option_definitions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });
  if (!includeInactive) q = q.eq("is_active", true);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapOption(row as Record<string, unknown>));
}

const getCachedRoomOptions = (tenantId: string, includeInactive: boolean) =>
  unstable_cache(
    () => listRoomOptionsUncached(tenantId, includeInactive),
    tenantCacheKey(tenantId, CACHE_TAGS.roomCatalog, "options", String(includeInactive)),
    {
      tags: [CACHE_TAGS.roomCatalog, tenantCacheTag(tenantId, "room-catalog")],
      revalidate: 300,
    }
  );

export async function listRoomOptions(includeInactive = false): Promise<RoomOptionDefinition[]> {
  const { tenantId } = await getTenantScope();
  return getCachedRoomOptions(tenantId, includeInactive)();
}

export async function getRoomCatalogContext(
  buildingId?: string
): Promise<RoomCatalogContext> {
  const [types, options] = await Promise.all([
    listRoomTypes(),
    listRoomOptions(),
  ]);
  const buildingPolicies = buildingId
    ? await getBuildingOptionPolicies(buildingId)
    : [];
  return { types, options, buildingPolicies };
}

export async function getBuildingOptionPolicies(
  buildingId: string
): Promise<BuildingOptionPolicy[]> {
  const { tenantId, supabase } = await getTenantScope();
  await requireBuildingInTenant(supabase, tenantId, buildingId);

  const { data, error } = await supabase
    .from("building_option_policies")
    .select("building_id, option_id, mode")
    .eq("building_id", buildingId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    building_id: String(row.building_id),
    option_id: String(row.option_id),
    mode: row.mode as OptionPolicyMode,
  }));
}

/** Sincronizează politica AC din ac_mode legacy dacă lipsește din catalog. */
export async function ensureBuildingPoliciesFromLegacy(
  buildingId: string,
  acMode: AcMode
): Promise<BuildingOptionPolicy[]> {
  const options = await listRoomOptions(true);
  const acOption = options.find((o) => o.slug === "ac");
  const existing = await getBuildingOptionPolicies(buildingId);

  const policies: { option_id: string; mode: OptionPolicyMode }[] = [];

  for (const opt of options) {
    const found = existing.find((p) => p.option_id === opt.id);
    if (found) {
      policies.push({ option_id: opt.id, mode: found.mode });
      continue;
    }
    if (opt.slug === "ac" && acOption) {
      policies.push({ option_id: opt.id, mode: acModeToPolicyMode(acMode) });
    } else {
      policies.push({ option_id: opt.id, mode: "per_room" });
    }
  }

  if (policies.length > 0) {
    await setBuildingOptionPolicies(buildingId, policies);
  }
  return getBuildingOptionPolicies(buildingId);
}

export async function setBuildingOptionPolicies(
  buildingId: string,
  policies: { option_id: string; mode: OptionPolicyMode }[]
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  await requireBuildingInTenant(supabase, tenantId, buildingId);

  const { error: delErr } = await supabase
    .from("building_option_policies")
    .delete()
    .eq("building_id", buildingId);
  if (delErr) throw new Error(delErr.message);

  if (policies.length === 0) return;

  const { error } = await supabase.from("building_option_policies").insert(
    policies.map((p) => ({
      building_id: buildingId,
      option_id: p.option_id,
      mode: p.mode,
    }))
  );
  if (error) throw new Error(error.message);

  const options = await listRoomOptions(true);
  const acOpt = options.find((o) => o.slug === "ac");
  if (acOpt) {
    const mode = policies.find((p) => p.option_id === acOpt.id)?.mode;
    if (mode) {
      await supabase
        .from("buildings")
        .update({ ac_mode: mode })
        .eq("tenant_id", tenantId)
        .eq("id", buildingId);
    }
  }
}

export async function getRoomEnabledOptionIds(roomId: string): Promise<string[]> {
  const { tenantId, supabase } = await getTenantScope();
  await requireRoomInTenant(supabase, tenantId, roomId);

  const { data, error } = await supabase
    .from("room_enabled_options")
    .select("option_id")
    .eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => String(r.option_id));
}

export async function setRoomEnabledOptions(
  roomId: string,
  optionIds: string[]
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  await requireRoomInTenant(supabase, tenantId, roomId);

  const { error: delErr } = await supabase
    .from("room_enabled_options")
    .delete()
    .eq("room_id", roomId);
  if (delErr) throw new Error(delErr.message);

  if (optionIds.length === 0) return;
  const { error } = await supabase.from("room_enabled_options").insert(
    optionIds.map((option_id) => ({ room_id: roomId, option_id }))
  );
  if (error) throw new Error(error.message);
}

export function resolveRoomOptionsForForm(input: {
  options: RoomOptionDefinition[];
  policies: BuildingOptionPolicy[];
  type: RoomTypeDefinition | null;
  selectedOptionIds: string[];
}): Array<RoomOptionDefinition & { enabled: boolean; editable: boolean; mode: OptionPolicyMode }> {
  return input.options.map((option) => {
    const mode = policyModeForOption(input.policies, option.id);
    const typeDefault = input.type?.default_option_ids.includes(option.id) ?? false;
    const roomSelected = input.selectedOptionIds.includes(option.id);
    const resolved = resolveOptionEnabled(mode, roomSelected, typeDefault);
    return { ...option, ...resolved, mode };
  });
}

export function calculatePriceFromCatalog(input: {
  type: RoomTypeDefinition | null;
  buildingDefaultPrice: number;
  options: RoomOptionDefinition[];
  policies: BuildingOptionPolicy[];
  typeDefaultOptionIds: string[];
  selectedOptionIds: string[];
  overridePrice?: number | null;
}): number {
  const enabledOptions = input.options.filter((opt) => {
    const mode = policyModeForOption(input.policies, opt.id);
    const resolved = resolveOptionEnabled(
      mode,
      input.selectedOptionIds.includes(opt.id),
      input.typeDefaultOptionIds.includes(opt.id)
    );
    return resolved.enabled;
  });

  return computeRoomPrice({
    type: input.type,
    buildingDefaultPrice: input.buildingDefaultPrice,
    enabledOptions,
    overridePrice: input.overridePrice,
  });
}

export async function createRoomType(input: {
  name: string;
  capacity_base: number;
  base_price_per_night: number;
  sort_order?: number;
  default_option_ids?: string[];
}): Promise<{ id: string }> {
  const { tenantId, supabase } = await getTenantScope();
  const slug = slugifyCatalogName(input.name);
  if (!slug) throw new Error("room_type.invalid_name");

  const { data, error } = await supabase
    .from("room_type_definitions")
    .insert(
      withTenantId(tenantId, {
        slug,
        name: input.name.trim(),
        capacity_base: input.capacity_base,
        base_price_per_night: input.base_price_per_night,
        sort_order: input.sort_order ?? 0,
        is_system: false,
        is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (input.default_option_ids?.length) {
    await supabase.from("room_type_default_options").insert(
      input.default_option_ids.map((option_id) => ({
        room_type_id: data.id,
        option_id,
      }))
    );
  }
  return { id: data.id };
}

export async function updateRoomType(
  id: string,
  input: {
    name: string;
    capacity_base: number;
    base_price_per_night: number;
    sort_order: number;
    is_active: boolean;
    default_option_ids: string[];
  }
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  await requireRoomTypeInTenant(supabase, tenantId, id);

  const { error } = await supabase
    .from("room_type_definitions")
    .update({
      name: input.name.trim(),
      capacity_base: input.capacity_base,
      base_price_per_night: input.base_price_per_night,
      sort_order: input.sort_order,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("room_type_default_options").delete().eq("room_type_id", id);
  if (input.default_option_ids.length) {
    const { error: insErr } = await supabase.from("room_type_default_options").insert(
      input.default_option_ids.map((option_id) => ({ room_type_id: id, option_id }))
    );
    if (insErr) throw new Error(insErr.message);
  }
}

export async function createRoomOption(input: {
  name: string;
  description?: string;
  price_per_night_addon: number;
  sort_order?: number;
}): Promise<{ id: string }> {
  const { tenantId, supabase } = await getTenantScope();
  const slug = slugifyCatalogName(input.name);
  if (!slug) throw new Error("room_option.invalid_name");

  const { data, error } = await supabase
    .from("room_option_definitions")
    .insert(
      withTenantId(tenantId, {
        slug,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        price_per_night_addon: input.price_per_night_addon,
        sort_order: input.sort_order ?? 0,
        is_system: false,
        is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateRoomOption(
  id: string,
  input: {
    name: string;
    description?: string;
    price_per_night_addon: number;
    sort_order: number;
    is_active: boolean;
  }
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("room_option_definitions")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price_per_night_addon: input.price_per_night_addon,
      sort_order: input.sort_order,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Map room_id → slug-uri opțiuni active (AC, frigider…). */
async function getRoomOptionSlugsByRoomIdsUncached(
  tenantId: string,
  roomIds: string[]
): Promise<Record<string, string[]>> {
  if (roomIds.length === 0) return {};
  const supabase = createPublicAdminClient();

  const { data: scopedRooms, error: roomErr } = await supabase
    .from("rooms")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("id", roomIds);
  if (roomErr) throw new Error(roomErr.message);

  const scopedIds = (scopedRooms ?? []).map((r) => String(r.id));
  if (scopedIds.length === 0) return {};

  const { data, error } = await supabase
    .from("room_enabled_options")
    .select("room_id, room_option_definitions ( slug )")
    .in("room_id", scopedIds);
  if (error) throw new Error(error.message);

  const out: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const rid = String(row.room_id);
    const def = row.room_option_definitions as
      | { slug: string }
      | { slug: string }[]
      | null;
    const slug = Array.isArray(def) ? def[0]?.slug : def?.slug;
    if (!slug) continue;
    if (!out[rid]) out[rid] = [];
    out[rid].push(slug);
  }
  return out;
}

const getCachedRoomOptionSlugsByRoomIds = (tenantId: string, roomIds: string[]) =>
  unstable_cache(
    () => getRoomOptionSlugsByRoomIdsUncached(tenantId, roomIds),
    tenantCacheKey(tenantId, CACHE_TAGS.roomOptionsByRoom, ...roomIds.sort()),
    {
      tags: [CACHE_TAGS.roomCatalog, CACHE_TAGS.roomOptionsByRoom, tenantCacheTag(tenantId, "room-options-by-room")],
      revalidate: 300,
    }
  );

export async function getRoomOptionSlugsByRoomIds(
  roomIds: string[]
): Promise<Record<string, string[]>> {
  const { tenantId } = await getTenantScope();
  return getCachedRoomOptionSlugsByRoomIds(tenantId, roomIds)();
}

export function parseSelectedOptionIds(formData: FormData): string[] {
  return formData.getAll("option_ids").map(String).filter((id) => id.length > 0);
}

export function hasAcFromOptions(
  options: RoomOptionDefinition[],
  enabledIds: string[]
): boolean {
  const ac = options.find((o) => o.slug === "ac");
  return ac ? enabledIds.includes(ac.id) : false;
}

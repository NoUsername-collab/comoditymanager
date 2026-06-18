import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";
import {
  DEFAULT_STATISTICS_VISIBILITY,
  parseStatisticsVisibility,
  type StatisticsVisibility,
} from "@/domain/settings/statistics-visibility";
import type { ThemeId, ThemeMode, ThemeSettings } from "@/lib/themes";
import { migrateLegacyPaletteKey } from "@/lib/themes";

export type PensionSettings = {
  id: string;
  display_name: string;
  default_check_in_time: string;
  default_check_out_time: string;
  total_extra_beds_max: number;
  admin_palette_source: "catalog";
  admin_palette_key: ThemeId;
  admin_day_night: ThemeMode;
  statistics_visibility: StatisticsVisibility;
};

function parseDayNight(raw: unknown): ThemeMode {
  return raw === "day" || raw === "night" ? raw : "night";
}

const PENSION_SETTINGS_BASE_SELECT =
  "id, display_name, default_check_in_time, default_check_out_time, total_extra_beds_max, admin_palette_source, admin_palette_key, admin_day_night";

function isStatisticsVisibilityColumnMissing(message: string): boolean {
  return message.includes("statistics_visibility");
}

async function getPensionSettingsUncached(tenantId: string): Promise<PensionSettings | null> {
  // Always read from public — pension settings are global, not sim-scoped
  const supabase = createPublicAdminClient();
  let result = await supabase
    .from("pension_settings")
    .select(`${PENSION_SETTINGS_BASE_SELECT}, statistics_visibility`)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  let statisticsVisibility = DEFAULT_STATISTICS_VISIBILITY;

  if (result.error && isStatisticsVisibilityColumnMissing(result.error.message)) {
    result = await supabase
      .from("pension_settings")
      .select(PENSION_SETTINGS_BASE_SELECT)
      .eq("tenant_id", tenantId)
      .maybeSingle();
  } else if (result.data && "statistics_visibility" in result.data) {
    statisticsVisibility = parseStatisticsVisibility(result.data.statistics_visibility);
  }

  if (result.error) throw new Error(result.error.message);
  const data = result.data;
  if (!data) return null;

  return {
    id: data.id,
    display_name: data.display_name,
    default_check_in_time: String(data.default_check_in_time).slice(0, 5),
    default_check_out_time: String(data.default_check_out_time).slice(0, 5),
    total_extra_beds_max: data.total_extra_beds_max,
    admin_palette_source: "catalog",
    admin_palette_key: migrateLegacyPaletteKey(
      typeof data.admin_palette_key === "string" && data.admin_palette_key.length > 0
        ? data.admin_palette_key
        : "noir"
    ),
    admin_day_night: parseDayNight(data.admin_day_night),
    statistics_visibility: statisticsVisibility,
  };
}

const getCachedPensionSettings = (tenantId: string) =>
  unstable_cache(
    () => getPensionSettingsUncached(tenantId),
    ["pension-settings", tenantId],
    {
      tags: [CACHE_TAGS.pensionSettings, `tenant-${tenantId}-settings`],
      revalidate: 300,
    }
  );

const loadPensionSettings = cache((tenantId: string) =>
  getCachedPensionSettings(tenantId)()
);

/** Per-request dedupe + 5min cross-request cache (busted via pensionSettings tag). */
export async function getPensionSettings(): Promise<PensionSettings | null> {
  const tenantId = await resolveTenantIdForData();
  return loadPensionSettings(tenantId);
}

export function pensionAppearanceSettings(
  s: PensionSettings
): ThemeSettings {
  return {
    theme: migrateLegacyPaletteKey(s.admin_palette_key),
    mode: s.admin_day_night,
  };
}

export async function updatePensionSettings(
  id: string,
  input: {
    display_name: string;
    default_check_in_time: string;
    default_check_out_time: string;
    total_extra_beds_max: number;
    admin_palette_source: "catalog";
    admin_palette_key: string;
    admin_day_night: ThemeMode;
  }
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("pension_settings")
    .update({
      display_name: input.display_name.trim(),
      default_check_in_time: input.default_check_in_time,
      default_check_out_time: input.default_check_out_time,
      total_extra_beds_max: input.total_extra_beds_max,
      admin_palette_source: input.admin_palette_source,
      admin_palette_key: input.admin_palette_key,
      admin_day_night: input.admin_day_night,
    })
    .eq("tenant_id", tenantId)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export const STATISTICS_VISIBILITY_MIGRATION_ERROR =
  "settings.statistics_visibility_migration_required";

export async function updateStatisticsVisibility(
  visibility: StatisticsVisibility
): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("pension_settings")
    .update({ statistics_visibility: visibility })
    .eq("tenant_id", tenantId);

  if (error) {
    if (isStatisticsVisibilityColumnMissing(error.message)) {
      throw new Error(STATISTICS_VISIBILITY_MIGRATION_ERROR);
    }
    throw new Error(error.message);
  }
}

export function pensionStatisticsVisibility(
  settings: PensionSettings | null
): StatisticsVisibility {
  return settings?.statistics_visibility ?? DEFAULT_STATISTICS_VISIBILITY;
}

/** Single-row partial update on pension_settings (atomic per tenant). */
export async function updatePensionSettingsPartial(
  fields: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(fields).length === 0) return;

  const { tenantId, supabase } = await getTenantScope();

  const { data: existing, error: readError } = await supabase
    .from("pension_settings")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  if (!existing) {
    const { error: insertError } = await supabase.from("pension_settings").insert({
      tenant_id: tenantId,
      display_name: "Pensiune",
      admin_palette_key: "noir",
      ...fields,
    });
    if (insertError) throw new Error(insertError.message);
    return;
  }

  const { data, error } = await supabase
    .from("pension_settings")
    .update(fields)
    .eq("tenant_id", tenantId)
    .select("tenant_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("settings.pension_settings_missing");
}

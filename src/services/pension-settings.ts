import { unstable_cache } from "next/cache";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";
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
};

function parseDayNight(raw: unknown): ThemeMode {
  return raw === "day" || raw === "night" ? raw : "night";
}

async function getPensionSettingsUncached(tenantId: string): Promise<PensionSettings | null> {
  // Always read from public — pension settings are global, not sim-scoped
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("pension_settings")
    .select(
      "id, display_name, default_check_in_time, default_check_out_time, total_extra_beds_max, admin_palette_source, admin_palette_key, admin_day_night"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
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
        : "default"
    ),
    admin_day_night: parseDayNight(data.admin_day_night),
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

export async function getPensionSettings(): Promise<PensionSettings | null> {
  const tenantId = await resolveTenantIdForData();
  return getCachedPensionSettings(tenantId)();
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

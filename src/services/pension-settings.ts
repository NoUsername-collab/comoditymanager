import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
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

async function getPensionSettingsUncached(): Promise<PensionSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pension_settings")
    .select(
      "id, display_name, default_check_in_time, default_check_out_time, total_extra_beds_max, admin_palette_source, admin_palette_key, admin_day_night"
    )
    .limit(1)
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

const getCachedPensionSettings = unstable_cache(getPensionSettingsUncached, undefined, {
  tags: [CACHE_TAGS.pensionSettings],
  revalidate: 300,
});

export async function getPensionSettings(): Promise<PensionSettings | null> {
  return getCachedPensionSettings();
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
  const supabase = createAdminClient();
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
    .eq("id", id);

  if (error) throw new Error(error.message);
}

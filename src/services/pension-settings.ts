import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminPaletteSettings,
  AdminPaletteSource,
} from "@/lib/admin-palettes/types";
import { migrateLegacyPaletteKey } from "@/lib/themes";
import type { AdminTheme } from "@/lib/admin-theme";

export type PensionSettings = {
  id: string;
  display_name: string;
  default_check_in_time: string;
  default_check_out_time: string;
  total_extra_beds_max: number;
  admin_palette_source: AdminPaletteSource;
  admin_palette_key: string;
  admin_day_night: AdminTheme;
};

function parsePaletteSource(_raw: unknown): AdminPaletteSource {
  return "catalog";
}

function parseDayNight(raw: unknown): AdminTheme {
  return raw === "day" || raw === "night" ? raw : "night";
}

export async function getPensionSettings(): Promise<PensionSettings | null> {
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
    admin_palette_source: parsePaletteSource(data.admin_palette_source),
    admin_palette_key: migrateLegacyPaletteKey(
      typeof data.admin_palette_key === "string" && data.admin_palette_key.length > 0
        ? data.admin_palette_key
        : "default"
    ),
    admin_day_night: parseDayNight(data.admin_day_night),
  };
}

export function pensionAppearanceSettings(
  s: PensionSettings
): AdminPaletteSettings {
  return {
    admin_palette_source: "catalog",
    admin_palette_key: migrateLegacyPaletteKey(s.admin_palette_key),
    admin_day_night: s.admin_day_night,
  };
}

export async function updatePensionSettings(
  id: string,
  input: {
    display_name: string;
    default_check_in_time: string;
    default_check_out_time: string;
    total_extra_beds_max: number;
    admin_palette_source: AdminPaletteSource;
    admin_palette_key: string;
    admin_day_night: AdminTheme;
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

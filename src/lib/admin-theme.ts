import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";
import {
  fromLegacyAppearance,
  readThemeSettings,
  writeThemeSettings,
  type ThemeSettings,
} from "@/lib/themes";
import { THEME_BOOT_SCRIPT as THEME_BOOT } from "@/lib/themes/boot";

export type AdminTheme = "day" | "night";

export const ADMIN_THEME_STORAGE_KEY = "casaemil-admin-theme";
export const ADMIN_PALETTE_SOURCE_KEY = "casaemil-admin-palette-source";
export const ADMIN_PALETTE_KEY_KEY = "casaemil-admin-palette-key";

export const ADMIN_THEME_BOOT_SCRIPT = THEME_BOOT;

export function readAppearanceFromStorage(): AdminPaletteSettings {
  const { theme, mode } = readThemeSettings();
  return {
    admin_palette_source: "catalog",
    admin_palette_key: theme,
    admin_day_night: mode,
  };
}

export function writeAppearanceToStorage(settings: AdminPaletteSettings): void {
  const themeSettings: ThemeSettings = fromLegacyAppearance(settings);
  writeThemeSettings(themeSettings);
}

export function readAdminTheme(): AdminTheme {
  return readAppearanceFromStorage().admin_day_night;
}

export function writeAdminTheme(theme: AdminTheme): void {
  const current = readAppearanceFromStorage();
  writeAppearanceToStorage({ ...current, admin_day_night: theme });
  try {
    document.documentElement.setAttribute("data-mode", theme);
    document.documentElement.setAttribute("data-admin-theme", theme);
  } catch {
    /* ignore */
  }
}

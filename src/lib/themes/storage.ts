export const ADMIN_THEME_STORAGE_KEY = "casaemil-admin-theme";
export const ADMIN_PALETTE_SOURCE_KEY = "casaemil-admin-palette-source";
export const ADMIN_PALETTE_KEY_KEY = "casaemil-admin-palette-key";
import {
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  migrateLegacyPaletteKey,
  isThemeId,
} from "./catalog";
import type { LegacyAppearanceSettings, ThemeId, ThemeMode, ThemeSettings } from "./types";

export const THEME_STORAGE_KEY = "casaemil-theme-id";
export const THEME_MODE_STORAGE_KEY = "casaemil-theme-mode";

export function readThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") {
    return { theme: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }
  try {
    const legacyKey = localStorage.getItem(ADMIN_PALETTE_KEY_KEY);
    const legacyMode = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    const themeRaw = localStorage.getItem(THEME_STORAGE_KEY) ?? legacyKey;
    const modeRaw = localStorage.getItem(THEME_MODE_STORAGE_KEY) ?? legacyMode;
    const theme = themeRaw ? migrateLegacyPaletteKey(themeRaw) : DEFAULT_THEME_ID;
    const mode: ThemeMode =
      modeRaw === "day" || modeRaw === "night" ? modeRaw : DEFAULT_THEME_MODE;
    return { theme, mode };
  } catch {
    return { theme: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }
}

export function writeThemeSettings(settings: ThemeSettings): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, settings.mode);
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, settings.mode);
    localStorage.setItem(ADMIN_PALETTE_SOURCE_KEY, "catalog");
    localStorage.setItem(ADMIN_PALETTE_KEY_KEY, settings.theme);
  } catch {
    /* ignore */
  }
}

export function toLegacyAppearance(settings: ThemeSettings): LegacyAppearanceSettings {
  return {
    admin_palette_source: "catalog",
    admin_palette_key: settings.theme,
    admin_day_night: settings.mode,
  };
}

export function fromLegacyAppearance(
  legacy: Partial<LegacyAppearanceSettings>
): ThemeSettings {
  const key = legacy.admin_palette_key ?? DEFAULT_THEME_ID;
  return {
    theme: isThemeId(key) ? key : migrateLegacyPaletteKey(key),
    mode:
      legacy.admin_day_night === "day" || legacy.admin_day_night === "night"
        ? legacy.admin_day_night
        : DEFAULT_THEME_MODE,
  };
}

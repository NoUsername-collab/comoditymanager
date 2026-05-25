import {
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  migrateLegacyPaletteKey,
} from "./catalog";
import type { ThemeMode, ThemeSettings } from "./types";

export const THEME_STORAGE_KEY = "casaemil-theme-id";
export const THEME_MODE_STORAGE_KEY = "casaemil-theme-mode";

/** Legacy keys — read-only for migration, no longer written. */
const LEGACY_KEY_KEY = "casaemil-admin-palette-key";
const LEGACY_MODE_KEY = "casaemil-admin-theme";

export function readThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") {
    return { theme: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }
  try {
    const legacyKey = localStorage.getItem(LEGACY_KEY_KEY);
    const legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
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
  } catch {
    /* ignore */
  }
}

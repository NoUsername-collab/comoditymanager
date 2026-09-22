import {
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  migrateLegacyPaletteKey,
} from "./catalog";
import type { ThemeMode, ThemeSettings } from "./types";
import { readLocalStorageFirst } from "@/lib/storage/local";

export const THEME_STORAGE_KEY = "zalmox-theme-id";
export const THEME_MODE_STORAGE_KEY = "zalmox-theme-mode";

/** Legacy keys — read-only for migration, no longer written. */
export const LEGACY_THEME_STORAGE_KEYS = [
  "casaemil-theme-id",
  "casaemil-admin-palette-key",
] as const;

export const LEGACY_THEME_MODE_STORAGE_KEYS = [
  "casaemil-theme-mode",
  "casaemil-admin-theme",
] as const;

export function readThemeSettings(): ThemeSettings {
  if (typeof window === "undefined") {
    return { theme: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }
  try {
    const themeRaw = readLocalStorageFirst([
      THEME_STORAGE_KEY,
      ...LEGACY_THEME_STORAGE_KEYS,
    ]);
    const modeRaw = readLocalStorageFirst([
      THEME_MODE_STORAGE_KEY,
      ...LEGACY_THEME_MODE_STORAGE_KEYS,
    ]);
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

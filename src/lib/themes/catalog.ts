import { DESIGN_THEMES } from "@/design/themes/catalog";
import type { ThemeDefinition, ThemeId } from "./types";
import { ALL_THEME_IDS } from "./types";

export const THEMES: ThemeDefinition[] = ALL_THEME_IDS.map((id) => ({
  id,
  name: DESIGN_THEMES[id].name,
  description: DESIGN_THEMES[id].description,
}));

export const DEFAULT_THEME_ID: ThemeId = "noir";
export const DEFAULT_THEME_MODE = "night" as const;

export function isThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as readonly string[]).includes(value);
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/** Migrate legacy keys from localStorage / DB. */
export function migrateLegacyPaletteKey(key: string): ThemeId {
  if (key === "default") return "noir";
  if (isThemeId(key)) return key;
  return DEFAULT_THEME_ID;
}

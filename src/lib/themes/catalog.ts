import type { ThemeDefinition, ThemeId } from "./types";
import { ALL_THEME_IDS } from "./types";

export const THEMES: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Default Hospira tenant theme",
  },
];

export const DEFAULT_THEME_ID: ThemeId = "default";
export const DEFAULT_THEME_MODE = "night" as const;

export function isThemeId(value: string): value is ThemeId {
  return (ALL_THEME_IDS as readonly string[]).includes(value);
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

/** Migrate legacy keys from localStorage / DB. */
export function migrateLegacyPaletteKey(key: string): ThemeId {
  void key;
  return DEFAULT_THEME_ID;
}

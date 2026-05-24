import type { ThemeDefinition, ThemeId } from "./types";
import { ALL_THEME_IDS } from "./types";

export const THEMES: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Alb simplu — curat, fără efecte, pentru lucru zilnic",
  },
  {
    id: "win95",
    name: "Windows 95",
    description: "Desktop teal, panouri 3D, MS Sans Serif",
  },
  {
    id: "winxp",
    name: "Windows XP Classic",
    description: "Bliss, taskbar Luna, ferestre XP",
  },
  {
    id: "romania",
    name: "România",
    description: "Tricolor subtil — albastru, galben, roșu + animații line",
  },
  {
    id: "italy",
    name: "Italia",
    description: "Verde, alb, roșu — stil mediteranean cu mișcare ușoară",
  },
  {
    id: "france",
    name: "Franța",
    description: "Bleu-blanc-rouge elegant, gradient HUD animat",
  },
  {
    id: "poland",
    name: "Polonia",
    description: "Alb și roșu cald, panouri line cu pulse discret",
  },
  {
    id: "spain",
    name: "Spania",
    description: "Roșu și galben cald — flamenco subtil pe același schelet",
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

/** Migrare chei vechi din localStorage / DB */
export function migrateLegacyPaletteKey(key: string): ThemeId {
  if (isThemeId(key)) return key;
  if (key === "minimal" || key === "pension" || key === "ocean" || key === "forest" || key === "rose") {
    return "default";
  }
  if (key === "win98" || key === "winxp") return "winxp";
  if (key === "win95") return "win95";
  return DEFAULT_THEME_ID;
}

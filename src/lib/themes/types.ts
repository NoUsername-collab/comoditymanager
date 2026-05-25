export type ThemeId =
  | "default"
  | "green"
  | "blue"
  | "orange"
  | "red"
  | "win95"
  | "winxp"
  | "romania"
  | "italy"
  | "france"
  | "poland"
  | "spain";

export type ThemeMode = "day" | "night";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
};

export type ThemeSettings = {
  theme: ThemeId;
  mode: ThemeMode;
};

/** Compat DB / form fields */
export type LegacyAppearanceSettings = {
  admin_palette_source: "catalog";
  admin_palette_key: ThemeId;
  admin_day_night: ThemeMode;
};

export const COUNTRY_THEME_IDS = [
  "romania",
  "italy",
  "france",
  "poland",
  "spain",
] as const satisfies readonly ThemeId[];

export const ALL_THEME_IDS = [
  "default",
  "green",
  "blue",
  "orange",
  "red",
  "win95",
  "winxp",
  ...COUNTRY_THEME_IDS,
] as const satisfies readonly ThemeId[];

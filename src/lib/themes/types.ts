export type ThemeId = "default" | "win95" | "winxp";

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

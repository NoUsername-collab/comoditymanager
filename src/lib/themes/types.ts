export type ThemeId = "default";

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

export const COUNTRY_THEME_IDS = [] as const satisfies readonly ThemeId[];

export const ALL_THEME_IDS = [
  "default",
] as const satisfies readonly ThemeId[];

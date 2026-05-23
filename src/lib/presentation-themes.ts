export type PresentationThemeId = "onyx" | "garden" | "sand";

export type PresentationTheme = {
  id: PresentationThemeId;
  label: string;
  short: string;
  swatch: string;
};

export const PRESENTATION_THEMES: PresentationTheme[] = [
  {
    id: "onyx",
    label: "Noir & aur",
    short: "Noir",
    swatch: "#0c0c0c",
  },
  {
    id: "garden",
    label: "Sage & crem",
    short: "Sage",
    swatch: "#5c7a6a",
  },
  {
    id: "sand",
    label: "Nisip cald",
    short: "Nisip",
    swatch: "#c4a574",
  },
];

export const DEFAULT_THEME: PresentationThemeId = "onyx";

export const THEME_STORAGE_KEY = "casaemil-theme";

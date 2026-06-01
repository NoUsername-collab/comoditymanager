export type AppLocale = "ro" | "en" | "bg";

export type LocaleFlagSpinnerColors = {
  /** Conic gradient stops (flag) */
  c1: string;
  c2: string;
  c3: string;
  track: string;
  glow: string;
};

/** Spinner ring colors inspired by each locale flag (RO / UK / BG). */
export const LOCALE_FLAG_SPINNER: Record<AppLocale, LocaleFlagSpinnerColors> = {
  ro: {
    c1: "#002b7f",
    c2: "#fcd116",
    c3: "#ce1126",
    track: "color-mix(in srgb, #002b7f 14%, transparent)",
    glow: "color-mix(in srgb, #002b7f 28%, transparent)",
  },
  en: {
    c1: "#012169",
    c2: "#c8102e",
    c3: "#ffffff",
    track: "color-mix(in srgb, #012169 14%, transparent)",
    glow: "color-mix(in srgb, #c8102e 22%, transparent)",
  },
  bg: {
    c1: "#00966e",
    c2: "#ffffff",
    c3: "#d62612",
    track: "color-mix(in srgb, #00966e 16%, transparent)",
    glow: "color-mix(in srgb, #00966e 24%, transparent)",
  },
};

export function normalizeAppLocale(raw: string | undefined): AppLocale {
  if (raw === "en" || raw === "bg") return raw;
  return "ro";
}

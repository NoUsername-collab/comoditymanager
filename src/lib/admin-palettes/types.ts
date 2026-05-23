import type { AdminTheme } from "@/lib/admin-theme";

export type AdminPaletteSource = "catalog" | "season_auto" | "season_manual";

export type CatalogPaletteId =
  | "pension"
  | "minimal"
  | "ocean"
  | "forest"
  | "rose"
  | "win95"
  | "win98"
  | "winxp"
  | "cyberpunk"
  | "victorian"
  | "medieval"
  | "newspaper";

export type SeasonPaletteId = "spring" | "summer" | "autumn" | "winter";

export type ResolvedPaletteId = CatalogPaletteId | SeasonPaletteId;

/** Tokeni CSS injectați pe <html> — extindeți treptat */
export type AdminPaletteTokens = {
  pageBg: string;
  panelBg: string;
  panelBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  ganttZoneCheckout: string;
  ganttZoneClean: string;
  ganttZoneCheckin: string;
  ganttLineCheckout: string;
  ganttLineCheckin: string;
  hudGradient: string;
  hudText: string;
  hudEyebrow: string;
  isRetro?: "win95" | "win98" | "winxp";
  /** Skin vizual special (fără desktop XP) */
  skin?: "minimal" | "cyberpunk" | "victorian" | "medieval" | "newspaper";
};

export type AdminPaletteDefinition = {
  id: ResolvedPaletteId;
  name: string;
  description: string;
  group: "catalog" | "season";
  seasonEmoji?: string;
  day: AdminPaletteTokens;
  night: AdminPaletteTokens;
};

export type AdminPaletteSettings = {
  admin_palette_source: AdminPaletteSource;
  admin_palette_key: string;
  admin_day_night: AdminTheme;
};

import type { AdminTheme } from "@/lib/admin-theme";
import type { ThemeId } from "@/lib/themes";

export type AdminPaletteSource = "catalog";

export type CatalogPaletteId = ThemeId;

export type ResolvedPaletteId = ThemeId;

/** Tokeni pentru previzualizare în setări (valorile live sunt în CSS) */
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
};

export type AdminPaletteDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  group: "catalog";
  day: AdminPaletteTokens;
  night: AdminPaletteTokens;
};

export type AdminPaletteSettings = {
  admin_palette_source: AdminPaletteSource;
  admin_palette_key: ThemeId;
  admin_day_night: AdminTheme;
};

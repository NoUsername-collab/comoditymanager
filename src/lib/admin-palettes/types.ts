import type { ThemeId, ThemeMode } from "@/lib/themes";

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

import type { AdminPaletteDefinition, AdminPaletteTokens } from "./types";

function t(partial: AdminPaletteTokens): AdminPaletteTokens {
  return partial;
}

/** Only active theme for now: default. New themes follow same day/night pattern. */
export const CATALOG_PALETTES: AdminPaletteDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Casa Emil default theme on a unified day/night structure.",
    group: "catalog",
    day: t({
      pageBg: "#eef0f8",
      panelBg: "#ffffff",
      panelBorder: "#dde2f0",
      text: "#1a1d2e",
      textMuted: "#5a6080",
      accent: "#4f7ef8",
      accentMuted: "#e4eaff",
      ganttZoneCheckout: "rgba(79, 126, 248, 0.06)",
      ganttZoneClean: "#ffffff",
      ganttZoneCheckin: "#f4f6ff",
      ganttLineCheckout: "#c8d0e8",
      ganttLineCheckin: "#4f7ef8",
      hudGradient: "#ffffff",
      hudText: "#1a1d2e",
      hudEyebrow: "#5a6080",
    }),
    night: t({
      pageBg: "#0f1117",
      panelBg: "#1a1d27",
      panelBorder: "#2e3348",
      text: "#e8eaf2",
      textMuted: "#8b90a8",
      accent: "#4f7ef8",
      accentMuted: "#1e2d5a",
      ganttZoneCheckout: "rgba(79, 126, 248, 0.055)",
      ganttZoneClean: "#1a1d27",
      ganttZoneCheckin: "#222638",
      ganttLineCheckout: "#3d4460",
      ganttLineCheckin: "#4f7ef8",
      hudGradient: "#1a1d27",
      hudText: "#e8eaf2",
      hudEyebrow: "#8b90a8",
    }),
  },
];

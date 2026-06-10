import { getDesignTheme } from "@/design/themes/catalog";
import type { AdminPaletteDefinition, AdminPaletteTokens } from "./types";
import type { ThemeId } from "@/lib/themes";

function fromAdminPrimitives(
  themeId: ThemeId,
  mode: "day" | "night"
): AdminPaletteTokens {
  const p = getDesignTheme(themeId).admin[mode];
  return {
    pageBg: p.bg,
    panelBg: p.surface,
    panelBorder: p.border,
    text: p.text,
    textMuted: p.textMuted,
    accent: p.accent,
    accentMuted: p.accentMuted,
    ganttZoneCheckout: `color-mix(in srgb, ${p.accent} 8%, ${p.surface})`,
    ganttZoneClean: p.surface,
    ganttZoneCheckin: p.surface2,
    ganttLineCheckout: p.borderStrong,
    ganttLineCheckin: p.accent,
    hudGradient: p.surface,
    hudText: p.text,
    hudEyebrow: p.textMuted,
  };
}

/** Admin palettes derived from the same 3 design families as the public site. */
export const CATALOG_PALETTES: AdminPaletteDefinition[] = (
  ["noir", "alpine", "mediterranean"] as const
).map((id) => {
  const def = getDesignTheme(id);
  return {
    id,
    name: def.name,
    description: def.description,
    group: "catalog",
    day: fromAdminPrimitives(id, "day"),
    night: fromAdminPrimitives(id, "night"),
  };
});

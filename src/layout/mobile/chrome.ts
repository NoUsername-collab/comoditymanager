import type { LayoutChrome } from "./types";
import type { LayoutMode, LayoutOrientation } from "./types";

/** When to show bottom nav, drawer, compact HUD (phone + tablet portrait). */
export function resolveLayoutChrome(
  mode: LayoutMode,
  orientation: LayoutOrientation
): LayoutChrome {
  if (mode === "mobile") return "compact";
  if (mode === "tablet" && orientation === "portrait") return "compact";
  return "wide";
}

export function isCompactLayoutChrome(chrome: LayoutChrome): boolean {
  return chrome === "compact";
}

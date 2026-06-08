import { LAYOUT_BREAKPOINTS, type LayoutBreakpointName } from "./breakpoints";
import type { LayoutMode, LayoutOrientation } from "./types";

/**
 * Phone in portrait AND landscape: shortest viewport side < 640px.
 * Width alone would mis-classify landscape phones as tablet.
 */
export function resolveLayoutMode(width: number, height: number): LayoutMode {
  const minSide = Math.min(width, height);
  if (minSide < LAYOUT_BREAKPOINTS.sm) return "mobile";
  if (width < LAYOUT_BREAKPOINTS.lg) return "tablet";
  return "desktop";
}

export function resolveLayoutOrientation(
  width: number,
  height: number
): LayoutOrientation {
  return width >= height ? "landscape" : "portrait";
}

/** Tailwind-style min-width tier the viewport is currently in. */
export function resolveLayoutBreakpoint(width: number): LayoutBreakpointName {
  if (width >= LAYOUT_BREAKPOINTS["2xl"]) return "2xl";
  if (width >= LAYOUT_BREAKPOINTS.xl) return "xl";
  if (width >= LAYOUT_BREAKPOINTS.lg) return "lg";
  if (width >= LAYOUT_BREAKPOINTS.md) return "md";
  return "sm";
}

export function isMobileLayoutMode(mode: LayoutMode): boolean {
  return mode === "mobile";
}

export function isTabletLayoutMode(mode: LayoutMode): boolean {
  return mode === "tablet";
}

export function isDesktopLayoutMode(mode: LayoutMode): boolean {
  return mode === "desktop";
}

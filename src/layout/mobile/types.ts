import type { LayoutBreakpointName } from "./breakpoints";

/** Viewport tier for shell chrome (mobile / tablet / desktop). */
export type LayoutMode = "mobile" | "tablet" | "desktop";

export type LayoutOrientation = "portrait" | "landscape";

/** Compact = bottom nav / drawer; wide = desktop chrome. */
export type LayoutChrome = "compact" | "wide";

/** Which app surface owns the shell. */
export type LayoutSurface =
  | "admin"
  | "public"
  | "platform"
  | "nestio-admin"
  | "auth";

export type MobileLayoutState = {
  mode: LayoutMode;
  orientation: LayoutOrientation;
  chrome: LayoutChrome;
  breakpoint: LayoutBreakpointName;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  isCompactChrome: boolean;
};

/**
 * Canonical layout breakpoints — single source of truth for JS/CSS mobile layout.
 * CSS mirrors these in mobile-layout.css (--ml-bp-*).
 */
export const LAYOUT_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type LayoutBreakpointName = keyof typeof LAYOUT_BREAKPOINTS;

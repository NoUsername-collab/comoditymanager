/**
 * Design tokens — mirror CSS variables from _base.css for native clients (WinUI / RN).
 * Values are defaults; runtime theme overrides come from tenant palette CSS.
 */

export const designTokenKeys = {
  /* Surfaces */
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  surface3: "--surface-3",
  border: "--border",
  borderStrong: "--border-strong",

  /* Typography */
  text: "--text",
  textMuted: "--text-muted",
  textFaint: "--text-faint",

  /* Brand / actions */
  accent: "--accent",
  accentHover: "--accent-hover",
  accentMuted: "--accent-muted",

  /* Semantic booking states */
  activeBg: "--active-bg",
  activeBorder: "--active-border",
  activeText: "--active-text",
  pendingBg: "--pending-bg",
  pendingBorder: "--pending-border",
  pendingText: "--pending-text",
  cancelledBg: "--cancelled-bg",
  cancelledBorder: "--cancelled-border",
  cancelledText: "--cancelled-text",

  /* Spacing / radius (px strings match CSS) */
  radiusSm: "--radius-sm",
  radiusMd: "--radius-md",
  radiusLg: "--radius-lg",

  /* Admin flat surfaces (operational UI — not Gantt bars) */
  adminSurfaceBg: "--admin-surface-bg",
  adminSurfaceBorder: "--admin-surface-border",
  adminSurfaceRadius: "--admin-surface-radius",
  adminSurfaceShadow: "--admin-surface-shadow",
  adminElevationShadow: "--admin-elevation-shadow",

  adminTintInfoBg: "--admin-tint-info-bg",
  adminTintWarningBg: "--admin-tint-warning-bg",
  adminTintSuccessBg: "--admin-tint-success-bg",
  adminTintDangerBg: "--admin-tint-danger-bg",
  adminTintVioletBg: "--admin-tint-violet-bg",
  adminTintSkyBg: "--admin-tint-sky-bg",
} as const;

/** Default light-theme values — sync with _base.css / default-day.css */
export const designTokenDefaults = {
  bg: "#eef0f8",
  surface: "#ffffff",
  surface2: "#f4f6ff",
  border: "#dde2f0",
  text: "#1a1d2e",
  textMuted: "#5a6080",
  accent: "#4f7ef8",
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 14,
} as const;

export type DesignTokenKey = keyof typeof designTokenKeys;

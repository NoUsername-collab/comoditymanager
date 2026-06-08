/**
 * Viewport-based display profile (independent of UA "mobile").
 * Override per device: Settings → Visuals (localStorage).
 * Shell chrome (bottom nav, drawers) follows the same preference via applyDocumentLayout.
 */

import { applyDocumentLayout } from "@/layout/mobile/apply-document-layout";
import { MOBILE_LAYOUT_BOOT_SCRIPT } from "@/layout/mobile/boot-script";
import {
  resolveAutoDisplayProfile,
  resolveEffectiveDisplayProfile as resolveEffectiveFromPreference,
} from "@/layout/mobile/display-integration";
import {
  getDisplayLayoutPreference,
  type DisplayProfileId,
} from "@/lib/ui/display-layout-preference";

export type DisplayProfile = DisplayProfileId;

export type ViewportHeightTier = "tall" | "standard" | "short";

const DISPLAY_PROFILES: DisplayProfile[] = [
  "wide",
  "laptop",
  "compact-laptop",
  "narrow",
];

export function isDisplayProfile(value: string | null | undefined): value is DisplayProfile {
  return DISPLAY_PROFILES.includes(value as DisplayProfile);
}

/** Auto-detect from viewport (phones use min side < 640 → narrow). */
export function resolveDisplayProfile(
  width: number,
  height: number
): DisplayProfile {
  return resolveAutoDisplayProfile(width, height);
}

export function resolveViewportHeightTier(height: number): ViewportHeightTier {
  if (height >= 820) return "tall";
  if (height >= 680) return "standard";
  return "short";
}

export function isCompactDisplayProfile(profile: DisplayProfile): boolean {
  return profile === "compact-laptop" || profile === "narrow";
}

export function resolveEffectiveDisplayProfile(
  width: number,
  height: number
): DisplayProfile {
  const pref =
    typeof window !== "undefined" ? getDisplayLayoutPreference() : "auto";
  return resolveEffectiveFromPreference(pref, width, height);
}

export function applyDisplayProfileToDocument(): void {
  applyDocumentLayout();
}

/** Runs before first paint + on resize. Reads localStorage layout preference. */
export const CLIENT_LAYOUT_BOOT_SCRIPT = MOBILE_LAYOUT_BOOT_SCRIPT;

export function displayProfileLabel(profile: DisplayProfile): string {
  switch (profile) {
    case "wide":
      return "Wide (≥1680px, ex. 15.6\" 1920×1080)";
    case "laptop":
      return "Laptop (1400–1679px)";
    case "compact-laptop":
      return "Compact laptop (1024–1399px, ex. 14\" 1366×768)";
    case "narrow":
      return "Narrow (phone / <1024px)";
  }
}

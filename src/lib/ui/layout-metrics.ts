import {
  getDisplayLayoutPreference,
  type DisplayLayoutPreference,
} from "@/lib/ui/display-layout-preference";
import {
  displayProfileLabel,
  isDisplayProfile,
  resolveDisplayProfile,
  resolveEffectiveDisplayProfile,
  resolveViewportHeightTier,
  type DisplayProfile,
  type ViewportHeightTier,
} from "@/lib/ui/display-profile";

export type LayoutMetrics = {
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  devicePixelRatio: number;
  visualViewport: {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
    scale: number;
  } | null;
  documentScrollWidth: number;
  documentClientWidth: number;
  hasHorizontalOverflow: boolean;
  displayProfile: DisplayProfile;
  displayLayoutPreference: DisplayLayoutPreference;
  displayLayoutMode: "auto" | "manual";
  detectedProfile: DisplayProfile;
  viewportHeightTier: ViewportHeightTier;
  compactViewportClass: boolean;
  device: string | null;
  touchDeviceClass: boolean;
  prefersReducedMotion: boolean;
  userAgent: string;
};

export function collectLayoutMetrics(): LayoutMetrics {
  const doc = document.documentElement;
  const vv = window.visualViewport;
  const innerWidth = window.innerWidth;
  const documentClientWidth = doc.clientWidth;
  const documentScrollWidth = doc.scrollWidth;
  const hasHorizontalOverflow = documentScrollWidth > documentClientWidth + 1;

  const innerHeight = window.innerHeight;
  const detectedProfile = resolveDisplayProfile(innerWidth, innerHeight);
  const viewportHeightTier = resolveViewportHeightTier(innerHeight);
  const displayLayoutPreference = getDisplayLayoutPreference();
  const domProfile = doc.getAttribute("data-display-profile");
  const profile = isDisplayProfile(domProfile)
    ? domProfile
    : resolveEffectiveDisplayProfile(innerWidth, innerHeight);
  const layoutModeAttr = doc.getAttribute("data-display-layout-mode");
  const displayLayoutMode =
    layoutModeAttr === "manual" ? "manual" : "auto";

  return {
    innerWidth,
    innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
    visualViewport: vv
      ? {
          width: vv.width,
          height: vv.height,
          offsetTop: vv.offsetTop,
          offsetLeft: vv.offsetLeft,
          scale: vv.scale,
        }
      : null,
    documentScrollWidth,
    documentClientWidth,
    hasHorizontalOverflow,
    displayProfile: profile,
    displayLayoutPreference,
    displayLayoutMode,
    detectedProfile,
    viewportHeightTier,
    compactViewportClass: doc.classList.contains("compact-viewport"),
    device: doc.getAttribute("data-device"),
    touchDeviceClass: doc.classList.contains("touch-device"),
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    userAgent: navigator.userAgent,
  };
}

export function formatLayoutMetrics(m: LayoutMetrics): string {
  const lines = [
    `viewport: ${m.innerWidth}×${m.innerHeight} (outer ${m.outerWidth}×${m.outerHeight})`,
    `dpr: ${m.devicePixelRatio}`,
    m.visualViewport
      ? `visualViewport: ${Math.round(m.visualViewport.width)}×${Math.round(m.visualViewport.height)} scale ${m.visualViewport.scale.toFixed(2)}`
      : "visualViewport: —",
    `doc: scroll ${m.documentScrollWidth} / client ${m.documentClientWidth}`,
    m.hasHorizontalOverflow ? "⚠ horizontal overflow" : "✓ no horizontal overflow",
    `layout: ${m.displayLayoutPreference} (${m.displayLayoutMode}) → ${m.displayProfile}`,
    `auto-detect: ${m.detectedProfile} (${displayProfileLabel(m.detectedProfile)})`,
    `height tier: ${m.viewportHeightTier} · compact CSS: ${m.compactViewportClass ? "yes" : "no"}`,
    `device: ${m.device ?? "?"} · touch CSS: ${m.touchDeviceClass ? "yes" : "no"}`,
    `reduced motion: ${m.prefersReducedMotion ? "yes" : "no"}`,
  ];
  return lines.join("\n");
}

export const LAYOUT_DEBUG_STORAGE_KEY = "platform-layout-debug";

export function isLayoutDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("layout_debug") === "1") {
      return true;
    }
    return localStorage.getItem(LAYOUT_DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableLayoutDebugPersist(): void {
  try {
    localStorage.setItem(LAYOUT_DEBUG_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

"use client";

import { useEffect, useState } from "react";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import {
  applyLayoutModeToDocument,
  getLayoutViewportSize,
  readLayoutChromeFromDom,
  readLayoutModeFromDom,
  readLayoutOrientationFromDom,
  resolveLayoutBreakpoint,
  type LayoutMode,
  type MobileLayoutState,
} from "@/layout/mobile";

function readState(): MobileLayoutState {
  const mode = readLayoutModeFromDom();
  const orientation = readLayoutOrientationFromDom();
  const chrome = readLayoutChromeFromDom();
  const { width, height } =
    typeof window !== "undefined"
      ? getLayoutViewportSize()
      : { width: 1280, height: 800 };
  return {
    mode,
    orientation,
    chrome,
    breakpoint: resolveLayoutBreakpoint(width),
    width,
    height,
    isMobile: mode === "mobile",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
    isLandscape: orientation === "landscape",
    isPortrait: orientation === "portrait",
    isCompactChrome: chrome === "compact",
  };
}

function syncDom(): void {
  applyLayoutModeToDocument();
}

/**
 * Unified viewport layout API. Prefer CSS `data-layout-mode` for styling;
 * use this hook only when JS must branch (drawers, conditional trees).
 */
export function useMobileLayout(): MobileLayoutState {
  const [state, setState] = useState<MobileLayoutState>(() => ({
    mode: "desktop" as LayoutMode,
    orientation: "landscape",
    chrome: "wide",
    breakpoint: "xl",
    width: 1280,
    height: 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: true,
    isPortrait: false,
    isCompactChrome: false,
  }));

  useEffect(() => {
    const sync = () => setState(readState());
    syncDom();
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  return state;
}

export function useIsMobileLayout(): boolean {
  return useMobileLayout().isMobile;
}

export function useIsCompactChrome(): boolean {
  return useMobileLayout().isCompactChrome;
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getLayoutViewportSize,
  readLayoutChromeFromDom,
  readLayoutModeFromDom,
  readLayoutOrientationFromDom,
  resolveLayoutBreakpoint,
  type LayoutChrome,
  type LayoutMode,
  type LayoutOrientation,
  type MobileLayoutState,
} from "@/layout/mobile";
import { subscribeLayoutViewportChanges } from "@/layout/mobile/resize-sync";

export type CompactLayoutHints = {
  compactChrome: boolean;
  orientation: LayoutOrientation;
  isPortrait: boolean;
  isLandscape: boolean;
};

const SERVER_COMPACT_HINTS: CompactLayoutHints = {
  compactChrome: false,
  orientation: "landscape",
  isPortrait: false,
  isLandscape: true,
};

function readCompactLayoutHints(): CompactLayoutHints {
  const chrome: LayoutChrome = readLayoutChromeFromDom();
  const orientation = readLayoutOrientationFromDom();
  return {
    compactChrome: chrome === "compact",
    orientation,
    isPortrait: orientation === "portrait",
    isLandscape: orientation === "landscape",
  };
}

function serializeCompactHints(hints: CompactLayoutHints): string {
  return `${hints.compactChrome}:${hints.orientation}`;
}

function subscribeCompactLayoutHints(onStoreChange: () => void): () => void {
  let prev = serializeCompactHints(readCompactLayoutHints());
  return subscribeLayoutViewportChanges(() => {
    const next = serializeCompactHints(readCompactLayoutHints());
    if (next !== prev) {
      prev = next;
      onStoreChange();
    }
  });
}

/**
 * Chrome + orientation only — re-renders when compact/wide or portrait/landscape
 * changes, not on every visualViewport pixel resize (iOS URL bar).
 */
export function useCompactLayoutHints(): CompactLayoutHints {
  return useSyncExternalStore(
    subscribeCompactLayoutHints,
    readCompactLayoutHints,
    () => SERVER_COMPACT_HINTS
  );
}

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

  useEffect(
    () => subscribeLayoutViewportChanges(() => setState(readState())),
    []
  );

  return state;
}

export function useIsMobileLayout(): boolean {
  return useMobileLayout().isMobile;
}

export function useIsCompactChrome(): boolean {
  return useCompactLayoutHints().compactChrome;
}

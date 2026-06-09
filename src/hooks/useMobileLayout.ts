"use client";

import { useSyncExternalStore } from "react";
import {
  getLayoutViewportSize,
  readLayoutChromeFromDom,
  readLayoutModeFromDom,
  readLayoutOrientationFromDom,
  resolveLayoutBreakpoint,
  type LayoutChrome,
  type LayoutOrientation,
  type MobileLayoutState,
} from "@/layout/mobile";
import { isDocumentLayoutBootstrapped } from "@/layout/mobile/apply-document-layout";
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

function compactHintsEqual(a: CompactLayoutHints, b: CompactLayoutHints): boolean {
  return (
    a.compactChrome === b.compactChrome &&
    a.orientation === b.orientation &&
    a.isPortrait === b.isPortrait &&
    a.isLandscape === b.isLandscape
  );
}

let cachedCompactHints: CompactLayoutHints = SERVER_COMPACT_HINTS;

/** Must return a stable reference when values are unchanged — React #185 otherwise. */
function getCompactLayoutHintsSnapshot(): CompactLayoutHints {
  if (typeof document === "undefined" || !isDocumentLayoutBootstrapped()) {
    return SERVER_COMPACT_HINTS;
  }
  const next = readCompactLayoutHints();
  if (compactHintsEqual(cachedCompactHints, next)) {
    return cachedCompactHints;
  }
  cachedCompactHints = next;
  return next;
}

function serializeCompactHints(hints: CompactLayoutHints): string {
  return `${hints.compactChrome}:${hints.orientation}`;
}

function subscribeCompactLayoutHints(onStoreChange: () => void): () => void {
  let prev = serializeCompactHints(getCompactLayoutHintsSnapshot());
  return subscribeLayoutViewportChanges(() => {
    const next = serializeCompactHints(getCompactLayoutHintsSnapshot());
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
    getCompactLayoutHintsSnapshot,
    () => SERVER_COMPACT_HINTS
  );
}

const SERVER_LAYOUT_STATE: MobileLayoutState = {
  mode: "desktop",
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
};

function readMobileLayoutState(): MobileLayoutState {
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

function mobileLayoutStateEqual(a: MobileLayoutState, b: MobileLayoutState): boolean {
  return (
    a.mode === b.mode &&
    a.orientation === b.orientation &&
    a.chrome === b.chrome &&
    a.breakpoint === b.breakpoint &&
    a.width === b.width &&
    a.height === b.height &&
    a.isMobile === b.isMobile &&
    a.isTablet === b.isTablet &&
    a.isDesktop === b.isDesktop &&
    a.isLandscape === b.isLandscape &&
    a.isPortrait === b.isPortrait &&
    a.isCompactChrome === b.isCompactChrome
  );
}

let cachedMobileLayoutState: MobileLayoutState = SERVER_LAYOUT_STATE;

function getMobileLayoutStateSnapshot(): MobileLayoutState {
  if (typeof document === "undefined" || !isDocumentLayoutBootstrapped()) {
    return SERVER_LAYOUT_STATE;
  }
  const next = readMobileLayoutState();
  if (mobileLayoutStateEqual(cachedMobileLayoutState, next)) {
    return cachedMobileLayoutState;
  }
  cachedMobileLayoutState = next;
  return next;
}

/** Re-render only on mode/orientation/chrome/breakpoint — not iOS URL-bar pixels. */
function serializeMobileLayoutState(state: MobileLayoutState): string {
  return `${state.mode}:${state.orientation}:${state.chrome}:${state.breakpoint}`;
}

function subscribeMobileLayoutState(onStoreChange: () => void): () => void {
  let prev = serializeMobileLayoutState(getMobileLayoutStateSnapshot());
  return subscribeLayoutViewportChanges(() => {
    const next = serializeMobileLayoutState(getMobileLayoutStateSnapshot());
    if (next !== prev) {
      prev = next;
      onStoreChange();
    }
  });
}

/**
 * Unified viewport layout API. Prefer CSS `data-layout-mode` for styling;
 * use this hook only when JS must branch (drawers, conditional trees).
 */
export function useMobileLayout(): MobileLayoutState {
  return useSyncExternalStore(
    subscribeMobileLayoutState,
    getMobileLayoutStateSnapshot,
    () => SERVER_LAYOUT_STATE
  );
}

export function useIsMobileLayout(): boolean {
  return useMobileLayout().isMobile;
}

export function useIsCompactChrome(): boolean {
  return useCompactLayoutHints().compactChrome;
}

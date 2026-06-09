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

function getCompactLayoutHintsSnapshot(): CompactLayoutHints {
  if (typeof document !== "undefined" && isDocumentLayoutBootstrapped()) {
    return readCompactLayoutHints();
  }
  return SERVER_COMPACT_HINTS;
}

/**
 * Chrome + orientation only — re-renders when compact/wide or portrait/landscape
 * changes, not on every visualViewport pixel resize (iOS URL bar).
 */
export function useCompactLayoutHints(): CompactLayoutHints {
  return useSyncExternalStore(
    subscribeCompactLayoutHints,
    readCompactLayoutHints,
    getCompactLayoutHintsSnapshot
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

/** Re-render only on mode/orientation/chrome/breakpoint — not iOS URL-bar pixels. */
function serializeMobileLayoutState(state: MobileLayoutState): string {
  return `${state.mode}:${state.orientation}:${state.chrome}:${state.breakpoint}`;
}

function subscribeMobileLayoutState(onStoreChange: () => void): () => void {
  let prev = serializeMobileLayoutState(readMobileLayoutState());
  return subscribeLayoutViewportChanges(() => {
    const next = serializeMobileLayoutState(readMobileLayoutState());
    if (next !== prev) {
      prev = next;
      onStoreChange();
    }
  });
}

function getMobileLayoutStateSnapshot(): MobileLayoutState {
  if (typeof document !== "undefined" && isDocumentLayoutBootstrapped()) {
    return readMobileLayoutState();
  }
  return SERVER_LAYOUT_STATE;
}

/**
 * Unified viewport layout API. Prefer CSS `data-layout-mode` for styling;
 * use this hook only when JS must branch (drawers, conditional trees).
 */
export function useMobileLayout(): MobileLayoutState {
  return useSyncExternalStore(
    subscribeMobileLayoutState,
    readMobileLayoutState,
    getMobileLayoutStateSnapshot
  );
}

export function useIsMobileLayout(): boolean {
  return useMobileLayout().isMobile;
}

export function useIsCompactChrome(): boolean {
  return useCompactLayoutHints().compactChrome;
}

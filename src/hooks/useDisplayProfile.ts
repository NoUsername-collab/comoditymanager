"use client";

import { useSyncExternalStore } from "react";
import { subscribeLayoutViewportChanges } from "@/layout/mobile/resize-sync";
import {
  isCompactDisplayProfile,
  isDisplayProfile,
  resolveViewportHeightTier,
  type DisplayProfile,
  type ViewportHeightTier,
} from "@/lib/ui/display-profile";

function readProfileFromDom(): DisplayProfile {
  if (typeof document === "undefined") return "laptop";
  const attr = document.documentElement.getAttribute("data-display-profile");
  return isDisplayProfile(attr) ? attr : "laptop";
}

function readHeightTierFromDom(): ViewportHeightTier {
  if (typeof document === "undefined") return "standard";
  const attr = document.documentElement.getAttribute("data-viewport-height");
  if (attr === "tall" || attr === "standard" || attr === "short") return attr;
  return "standard";
}

function readCompactFromDom(): boolean {
  return isCompactDisplayProfile(readProfileFromDom());
}

function subscribeDisplayLayout(onStoreChange: () => void): () => void {
  return subscribeLayoutViewportChanges(onStoreChange);
}

export function useDisplayProfile(): DisplayProfile {
  return useSyncExternalStore(
    subscribeDisplayLayout,
    readProfileFromDom,
    () => "laptop" as DisplayProfile
  );
}

export function useViewportHeightTier(): ViewportHeightTier {
  return useSyncExternalStore(
    subscribeDisplayLayout,
    readHeightTierFromDom,
    () => "standard" as ViewportHeightTier
  );
}

export function useIsCompactViewport(): boolean {
  return useSyncExternalStore(
    subscribeDisplayLayout,
    readCompactFromDom,
    () => false
  );
}

// Kept for any direct tier resolution outside React.
export { resolveViewportHeightTier };

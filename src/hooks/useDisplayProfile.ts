"use client";

import { useEffect, useState } from "react";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import {
  applyDisplayProfileToDocument,
  isCompactDisplayProfile,
  isDisplayProfile,
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

function syncDom(): void {
  applyDisplayProfileToDocument();
}

export function useDisplayProfile(): DisplayProfile {
  const [profile, setProfile] = useState<DisplayProfile>("laptop");

  useEffect(() => {
    const sync = () => {
      syncDom();
      setProfile(readProfileFromDom());
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  return profile;
}

export function useViewportHeightTier(): ViewportHeightTier {
  const [tier, setTier] = useState<ViewportHeightTier>("standard");

  useEffect(() => {
    const sync = () => {
      syncDom();
      setTier(readHeightTierFromDom());
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  return tier;
}

export function useIsCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const sync = () => {
      syncDom();
      setCompact(isCompactDisplayProfile(readProfileFromDom()));
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  return compact;
}

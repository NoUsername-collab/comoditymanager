"use client";

import { useEffect } from "react";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import { applyLayoutModeToDocument } from "@/layout/mobile";

/**
 * Keeps layout attrs in sync after hydration + on resize/orientation.
 * CSS guards read data-layout-chrome — no render branches needed.
 */
export function MobileLayoutGuard() {
  useEffect(() => {
    const sync = () => applyLayoutModeToDocument();
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

  return null;
}

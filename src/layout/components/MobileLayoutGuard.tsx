"use client";

import { useEffect } from "react";
import { subscribeLayoutViewportChanges } from "@/layout/mobile/resize-sync";

/**
 * Keeps layout attrs in sync after hydration + on resize/orientation.
 * CSS guards read data-layout-chrome — no render branches needed.
 */
export function MobileLayoutGuard() {
  useEffect(() => subscribeLayoutViewportChanges(), []);

  return null;
}

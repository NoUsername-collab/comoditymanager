"use client";

import { useEffect } from "react";
import { subscribeLayoutViewportChanges } from "@/layout/mobile/resize-sync";

function isCompactChromeBootstrapped(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-layout-chrome") === "compact"
  );
}

/**
 * Keeps layout attrs in sync after hydration + on resize/orientation.
 * CSS guards read data-layout-chrome — no render branches needed.
 */
export function MobileLayoutGuard() {
  useEffect(() => {
    const subscribe = () => subscribeLayoutViewportChanges();

    if (!isCompactChromeBootstrapped()) {
      return subscribe();
    }

    // Boot script already applied compact layout; defer duplicate resize wiring.
    let teardown: (() => void) | undefined;
    const start = () => {
      teardown = subscribe();
    };

    if (typeof requestIdleCallback === "function") {
      const idleId = requestIdleCallback(start, { timeout: 2500 });
      return () => {
        cancelIdleCallback(idleId);
        teardown?.();
      };
    }

    const timerId = window.setTimeout(start, 0);
    return () => {
      window.clearTimeout(timerId);
      teardown?.();
    };
  }, []);

  return null;
}

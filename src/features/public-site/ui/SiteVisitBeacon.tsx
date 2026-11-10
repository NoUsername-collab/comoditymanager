"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tells the site's own counter that a page was seen: its path and the site the
 * visitor came from. No cookie and nothing about the visitor is sent.
 */
export function SiteVisitBeacon() {
  const pathname = usePathname();
  // The site the visitor arrived from is only meaningful for the first page.
  const referrer = useRef<string | null>(null);

  useEffect(() => {
    if (referrer.current === null) referrer.current = document.referrer;
    else referrer.current = "";
    const body = JSON.stringify({ path: window.location.pathname, referrer: referrer.current });
    try {
      if (!navigator.sendBeacon?.("/api/site-visit", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/site-visit", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch {
      // Counting must never get in the visitor's way.
    }
  }, [pathname]);

  return null;
}

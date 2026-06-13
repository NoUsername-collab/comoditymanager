"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/** Scroll to #features when landing on home with hash (bottom nav „Mai mult”). */
export function GuestAppHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#features") return;
    window.requestAnimationFrame(() => {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [pathname]);

  return null;
}

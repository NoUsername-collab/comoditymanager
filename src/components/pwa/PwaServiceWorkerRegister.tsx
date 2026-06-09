"use client";

import { useEffect } from "react";
import { isPwaStandaloneClient } from "@/lib/pwa/install";

/** Registers /sw.js so Chrome can offer native PWA install. */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Non-fatal — install UI may fall back to manual steps */
    });
  }, []);

  useEffect(() => {
    if (!isPwaStandaloneClient()) return;
    const orientation = screen.orientation;
    if (!orientation?.lock) return;
    void orientation.lock("landscape").catch(() => {
      /* Manifest orientation is the fallback when lock is denied */
    });
  }, []);

  return null;
}

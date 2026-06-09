"use client";

import { useEffect } from "react";

/** Registers /sw.js so Chrome can offer native PWA install. */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Non-fatal — install UI may fall back to manual steps */
    });
  }, []);

  return null;
}

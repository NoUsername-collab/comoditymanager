"use client";

import { useEffect } from "react";

/** Registers /sw.js so Chrome can offer native PWA install. */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Dev chunk names are not hashed, so the cache-first worker would serve stale code.
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .then(() => caches.keys())
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Non-fatal — install UI may fall back to manual steps */
    });
  }, []);

  return null;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readPwaInstallContext,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

export type PwaInstallMode =
  | "prompt"
  | "ios"
  | "android-manual"
  | "desktop-manual"
  | null;

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ctx = readPwaInstallContext();
    setInstalled(ctx.installed);
    setIsIosSafari(ctx.isIosSafari);
    setIsMobile(ctx.isMobile);

    if (ctx.installed) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode: PwaInstallMode = installed
    ? null
    : deferred
      ? "prompt"
      : isIosSafari
        ? "ios"
        : isMobile
          ? "android-manual"
          : "desktop-manual";

  const visible = !installed;

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "manual"> => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setDeferred(null);
      }
      return outcome;
    }
    return "manual";
  }, [deferred]);

  return { visible, mode, install, installed };
}

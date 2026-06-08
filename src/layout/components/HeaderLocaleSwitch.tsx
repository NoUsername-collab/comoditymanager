"use client";

import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import { readLayoutChromeFromDom } from "@/layout/mobile";

type HeaderLocaleSlot = "nav" | "drawer";

/**
 * Renders a single LanguageSwitcher: nav on wide chrome, drawer on compact.
 * Client-only after mount to avoid duplicate SSR instances (hydration / clipPath ids).
 */
export function HeaderLocaleSwitch({ slot }: { slot: HeaderLocaleSlot }) {
  const [isCompact, setIsCompact] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setIsCompact(readLayoutChromeFromDom() === "compact");
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, sync);
    };
  }, []);

  if (isCompact === null) return null;

  if (slot === "nav" && !isCompact) return <LanguageSwitcher />;
  if (slot === "drawer" && isCompact) return <LanguageSwitcher />;
  return null;
}

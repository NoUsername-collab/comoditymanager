"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallInstructions } from "@/components/pwa/PwaInstallInstructions";

const DISMISSED_KEY = "zalmox-pwa-banner-dismissed";

export function PwaInstallBanner() {
  const t = useTranslations("admin.pwa");
  const { visible, mode, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // start hidden — avoid flash
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    if (mode === "prompt") {
      const outcome = await install();
      if (outcome === "accepted") dismiss();
    } else {
      setInstructionsOpen(true);
    }
  }

  // Arată doar pe touch, dacă nu e instalat, și dacă nu a dat dismiss
  if (!isTouchDevice || !visible || dismissed || !mode) return null;

  return (
    <>
      <div
        className={[
          "pwa-install-banner",
          "fixed inset-x-3 bottom-[max(0.75rem,var(--ml-safe-bottom,0px))] z-[calc(var(--z-overlay,200)-1)]",
          "flex items-center gap-[0.65rem] rounded-2xl border border-violet-500/30",
          "bg-[var(--admin-card,#1a1a2e)] px-3 py-[0.65rem] text-[var(--admin-text,#e8e8f0)]",
          "shadow-[0_8px_24px_rgb(0_0_0/0.3)]",
        ].join(" ")}
        role="complementary"
        aria-label={t("installApp")}
      >
        <span className="shrink-0 text-2xl leading-none" aria-hidden>
          ⚡
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-sm font-bold text-[var(--admin-text,#e8e8f0)]">
            Zalmox
          </strong>
          <span className="text-xs text-[var(--admin-text-muted,#8888aa)]">
            {t("bannerSub")}
          </span>
        </div>
        <button
          type="button"
          className="min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-lg border-none bg-violet-600 px-[0.85rem] py-[0.45rem] text-[0.8125rem] font-semibold text-white active:bg-violet-700"
          onClick={() => void handleInstall()}
        >
          {t("installApp")}
        </button>
        <button
          type="button"
          className="grid h-8 w-8 min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center rounded-md border-none bg-transparent p-0 text-[0.85rem] text-[var(--admin-text-muted,#8888aa)] active:text-[var(--admin-text,#e8e8f0)]"
          onClick={dismiss}
          aria-label={t("close")}
        >
          ✕
        </button>
      </div>

      {mode !== "prompt" && (
        <PwaInstallInstructions
          open={instructionsOpen}
          mode={mode}
          onClose={() => setInstructionsOpen(false)}
        />
      )}
    </>
  );
}

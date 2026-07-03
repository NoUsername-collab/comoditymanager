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
      <div className="pwa-install-banner" role="complementary" aria-label={t("installApp")}>
        <span className="pwa-install-banner__icon" aria-hidden>⚡</span>
        <div className="pwa-install-banner__text">
          <strong className="pwa-install-banner__title">Zalmox</strong>
          <span className="pwa-install-banner__sub">{t("bannerSub")}</span>
        </div>
        <button
          type="button"
          className="pwa-install-banner__btn"
          onClick={() => void handleInstall()}
        >
          {t("installApp")}
        </button>
        <button
          type="button"
          className="pwa-install-banner__close"
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

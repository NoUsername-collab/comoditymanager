"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import type { PwaInstallMode } from "@/hooks/usePwaInstall";

export function PwaInstallInstructions({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: Exclude<PwaInstallMode, null | "prompt">;
  onClose: () => void;
}) {
  const t = useTranslations("admin.pwa");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const steps =
    mode === "ios"
      ? [t("iosStep1"), t("iosStep2"), t("iosStep3")]
      : [t("androidManualStep")];

  const title = mode === "ios" ? t("iosTitle") : t("androidManualTitle");

  return (
    <AdminPortal>
      <button
        type="button"
        className="pwa-install-backdrop"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="pwa-install-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <h2 id="pwa-install-title" className="pwa-install-sheet__title">
          {title}
        </h2>
        <p className="pwa-install-sheet__hint">{t("installHint")}</p>
        <ol className="pwa-install-sheet__steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button
          type="button"
          className="pwa-install-sheet__close"
          onClick={onClose}
        >
          {t("close")}
        </button>
      </div>
    </AdminPortal>
  );
}

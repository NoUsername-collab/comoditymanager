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
      : mode === "desktop-manual"
        ? [t("desktopStep1"), t("desktopStep2"), t("desktopStep3")]
        : [t("androidManualStep")];

  const title =
    mode === "ios"
      ? t("iosTitle")
      : mode === "desktop-manual"
        ? t("desktopManualTitle")
        : t("androidManualTitle");

  return (
    <AdminPortal>
      <button
        type="button"
        className="pwa-install-backdrop fixed inset-0 z-[var(--z-overlay,200)] cursor-pointer border-none bg-black/45"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={[
          "pwa-install-sheet",
          "fixed inset-x-3 bottom-[max(0.75rem,var(--ml-safe-bottom,0px))] z-[calc(var(--z-overlay,200)+1)]",
          "rounded-2xl bg-[var(--surface-1,#fff)] px-[1.1rem] pb-[1.1rem] pt-4",
          "text-[var(--admin-text,#18181b)] shadow-[0_16px_48px_rgb(0_0_0/0.22)]",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <h2 id="pwa-install-title" className="m-0 mb-1.5 text-base font-bold">
          {title}
        </h2>
        <p className="m-0 mb-3 text-[0.8rem] leading-snug text-[var(--admin-muted,#71717a)]">
          {t("installHint")}
        </p>
        <ol className="mb-4 list-decimal pl-[1.15rem] text-[0.85rem] leading-[1.45] [&>li+li]:mt-1.5">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button
          type="button"
          className="min-h-11 w-full cursor-pointer rounded-[0.65rem] border-none bg-[var(--admin-accent,#059669)] text-[0.9rem] font-semibold text-white"
          onClick={onClose}
        >
          {t("close")}
        </button>
      </div>
    </AdminPortal>
  );
}

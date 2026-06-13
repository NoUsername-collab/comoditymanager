"use client";

import { useTranslations } from "next-intl";
import { MrzScanPanel } from "@/components/mrz/MrzScanPanel";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (data: MrzMappedIdentity) => void;
};

export function GuestMrzScanDialog({ open, onClose, onApply }: Props) {
  const t = useTranslations("guestApp.precheckin.mrz");

  if (!open) return null;

  return (
    <div className="guest-app__mrz-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-mrz-title">
      <button
        type="button"
        className="guest-app__mrz-backdrop"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div className="guest-app__mrz-sheet">
        <header className="guest-app__mrz-header">
          <h2 id="guest-mrz-title" className="guest-app__mrz-title">
            {t("title")}
          </h2>
          <button type="button" className="guest-app__mrz-close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </header>
        <MrzScanPanel
          open={open}
          variant="guest"
          translationNamespace="guestApp.precheckin.mrz"
          onClose={onClose}
          onApply={onApply}
        />
      </div>
    </div>
  );
}

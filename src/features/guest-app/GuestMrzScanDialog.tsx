"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";

function GuestMrzLoading() {
  const t = useTranslations("guestApp.precheckin.mrz");
  return (
    <p className="guest-app__mrz__loading" aria-busy="true" role="status">
      {t("loading")}
    </p>
  );
}

const MrzScanPanel = dynamic(
  () =>
    import("@/components/mrz/MrzScanPanel").then((m) => ({
      default: m.MrzScanPanel,
    })),
  { ssr: false, loading: GuestMrzLoading },
);

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

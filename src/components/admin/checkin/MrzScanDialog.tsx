"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";

function MrzScanLoading() {
  const t = useTranslations("admin.checkIn.mrz");
  return (
    <p className="mrz-scan__loading text-sm text-neutral-500" aria-busy="true" aria-label={t("loading")}>
      …
    </p>
  );
}

const MrzScanPanel = dynamic(
  () =>
    import("@/components/mrz/MrzScanPanel").then((m) => ({
      default: m.MrzScanPanel,
    })),
  {
    ssr: false,
    loading: MrzScanLoading,
  }
);

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (data: MrzMappedIdentity) => void;
};

export function MrzScanDialog({ open, onClose, onApply }: Props) {
  const t = useTranslations("admin.checkIn.mrz");

  return (
    <AdminFloatingPanel
      open={open}
      onClose={onClose}
      title={t("title")}
      variant="modal"
      width={480}
      className="mrz-scan-modal"
    >
      <MrzScanPanel
        open={open}
        variant="admin"
        translationNamespace="admin.checkIn.mrz"
        onClose={onClose}
        onApply={onApply}
      />
    </AdminFloatingPanel>
  );
}

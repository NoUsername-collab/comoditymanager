"use client";

import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { MrzScanPanel } from "@/components/mrz/MrzScanPanel";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";

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

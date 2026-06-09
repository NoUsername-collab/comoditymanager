"use client";

import { useTranslations } from "next-intl";
import { CheckinStepper } from "@/components/admin/checkin/CheckinStepper";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CheckinModal({ booking, settings, onClose, onSuccess }: Props) {
  const t = useTranslations("admin.checkIn");

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={t("title")}
      variant="modal"
      width={680}
      className="checkin-modal"
    >
      <CheckinStepper
        booking={booking}
        settings={settings}
        onComplete={() => {
          onSuccess?.();
          onClose();
        }}
        onCancel={onClose}
      />
    </AdminFloatingPanel>
  );
}

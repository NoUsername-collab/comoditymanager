"use client";

import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { CheckinStepper } from "./CheckinStepper";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  onClose: () => void;
};

export function CheckinModal({ booking, settings, onClose }: Props) {
  const t = useTranslations("admin.checkIn");

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={t("title")}
      variant="modal"
      width={540}
      className="checkin-modal"
    >
      <CheckinStepper
        booking={booking}
        settings={settings}
        onComplete={onClose}
        onCancel={onClose}
      />
    </AdminFloatingPanel>
  );
}

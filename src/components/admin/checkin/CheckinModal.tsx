"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

const CheckinStepper = dynamic(
  () =>
    import("./CheckinStepper").then((m) => ({
      default: m.CheckinStepper,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="checkin-stepper-skeleton min-h-[16rem] animate-pulse rounded-lg bg-zinc-50"
        aria-busy="true"
        aria-live="polite"
      />
    ),
  }
);

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

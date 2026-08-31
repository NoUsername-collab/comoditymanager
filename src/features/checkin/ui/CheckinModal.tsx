"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import "@/features/checkin/ui/import-checkin-styles";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

function CheckinStepperSkeleton() {
  const t = useTranslations("admin.checkIn");
  return (
    <div
      className="checkin-stepper-skeleton flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/90 px-4 py-8 text-sm text-zinc-600"
      aria-busy="true"
      aria-live="polite"
      aria-label={t("loadingStepper")}
    >
      <span
        className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-600"
        aria-hidden
      />
    </div>
  );
}

const CheckinStepper = dynamic(
  () =>
    import("@/features/checkin/ui/CheckinStepper").then((m) => ({
      default: m.CheckinStepper,
    })),
  {
    ssr: false,
    loading: CheckinStepperSkeleton,
  }
);

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

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { loadCheckinWizardContextAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

const CheckinModal = dynamic(
  () => import("./CheckinModal").then((m) => ({ default: m.CheckinModal })),
  { ssr: false }
);

type Props = {
  bookingId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When provided, skips the server fetch (e.g. booking detail page). */
  booking?: BookingForCheckin;
  settings?: CheckinSettings;
};

export function CheckinWizardLauncher({
  bookingId,
  open,
  onClose,
  onSuccess,
  booking: prefetchedBooking,
  settings: prefetchedSettings,
}: Props) {
  const t = useTranslations("admin.checkIn");
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<{
    booking: BookingForCheckin;
    settings: CheckinSettings;
  } | null>(
    prefetchedBooking && prefetchedSettings
      ? { booking: prefetchedBooking, settings: prefetchedSettings }
      : null
  );

  useEffect(() => {
    if (!open) {
      if (!prefetchedBooking || !prefetchedSettings) {
        setContext(null);
      }
      return;
    }

    if (prefetchedBooking && prefetchedSettings) {
      setContext({ booking: prefetchedBooking, settings: prefetchedSettings });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setContext(null);

    void loadCheckinWizardContextAction(bookingId).then((res) => {
      if (cancelled) return;
      setLoading(false);

      if (!res.ok) {
        showToast({
          kind: "error",
          title: tCommon("error"),
          message: res.error ?? tCommon("error"),
        });
        onClose();
        return;
      }

      if (res.hasExistingCheckin) {
        showToast({
          kind: "info",
          title: t("title"),
          message: t("alreadyCheckedIn"),
        });
        onClose();
        return;
      }

      if (res.booking && res.settings) {
        setContext({ booking: res.booking, settings: res.settings });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    bookingId,
    prefetchedBooking,
    prefetchedSettings,
    onClose,
    showToast,
    t,
    tCommon,
  ]);

  if (!open) return null;

  if (loading || !context) {
    return (
      <AdminFloatingPanel
        open
        onClose={onClose}
        title={t("title")}
        variant="modal"
        width={680}
        className="checkin-modal"
      >
        <div
          className="checkin-stepper-skeleton min-h-[16rem] animate-pulse rounded-lg bg-zinc-50"
          aria-busy="true"
          aria-live="polite"
        />
      </AdminFloatingPanel>
    );
  }

  return (
    <CheckinModal
      booking={context.booking}
      settings={context.settings}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

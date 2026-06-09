"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { loadCheckinWizardContextAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

const CheckinStepper = dynamic(
  () =>
    import("@/components/admin/checkin/CheckinStepper").then((m) => ({
      default: m.CheckinStepper,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="checkin-stepper-skeleton flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/90 px-4 py-8 text-sm text-zinc-600"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-600" />
      </div>
    ),
  }
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

function CheckinWizardLoading({ label }: { label: string }) {
  return (
    <div
      className="checkin-stepper-skeleton flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100/90 px-4 py-8 text-sm text-zinc-600"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-600" />
      {label}
    </div>
  );
}

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
  const onCloseRef = useRef(onClose);
  const onSuccessRef = useRef(onSuccess);
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const tCommonRef = useRef(tCommon);
  const prefetchRef = useRef({
    booking: prefetchedBooking,
    settings: prefetchedSettings,
  });

  const hasPrefetch = !!(prefetchedBooking && prefetchedSettings);

  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<{
    booking: BookingForCheckin;
    settings: CheckinSettings;
  } | null>(hasPrefetch ? { booking: prefetchedBooking!, settings: prefetchedSettings! } : null);

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
    showToastRef.current = showToast;
    tRef.current = t;
    tCommonRef.current = tCommon;
    prefetchRef.current = {
      booking: prefetchedBooking,
      settings: prefetchedSettings,
    };
  });

  useEffect(() => {
    if (!open) {
      if (!hasPrefetch) {
        setContext(null);
        setLoading(false);
      }
      return;
    }

    const { booking: prefetchBooking, settings: prefetchSettings } =
      prefetchRef.current;

    if (prefetchBooking && prefetchSettings) {
      setContext({ booking: prefetchBooking, settings: prefetchSettings });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setContext(null);

    void loadCheckinWizardContextAction(bookingId).then((res) => {
      if (cancelled) return;
      setLoading(false);

      if (!res.ok) {
        showToastRef.current({
          kind: "error",
          title: tCommonRef.current("error"),
          message: res.error ?? tCommonRef.current("error"),
        });
        onCloseRef.current();
        return;
      }

      if (res.hasExistingCheckin) {
        showToastRef.current({
          kind: "info",
          title: tRef.current("title"),
          message: tRef.current("alreadyCheckedIn"),
        });
        onCloseRef.current();
        return;
      }

      if (res.booking && res.settings) {
        setContext({ booking: res.booking, settings: res.settings });
        return;
      }

      showToastRef.current({
        kind: "error",
        title: tCommonRef.current("error"),
        message: tCommonRef.current("error"),
      });
      onCloseRef.current();
    });

    return () => {
      cancelled = true;
    };
  }, [open, bookingId, hasPrefetch]);

  if (!open) return null;

  const ready = !!context && !loading;

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={t("title")}
      variant="modal"
      width={680}
      className="checkin-modal"
    >
      {ready ? (
        <CheckinStepper
          booking={context.booking}
          settings={context.settings}
          onComplete={() => {
            onSuccessRef.current?.();
            onCloseRef.current();
          }}
          onCancel={() => onCloseRef.current()}
        />
      ) : (
        <CheckinWizardLoading label={tCommon("loading")} />
      )}
    </AdminFloatingPanel>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "@/components/admin/checkin/import-checkin-styles";
import { useTranslations } from "next-intl";
import { loadCheckinWizardContextAction } from "@/app/[locale]/admin/(panel)/checkin/actions";
import type { CheckinWizardContextResult } from "@/app/[locale]/admin/(panel)/checkin/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  CheckinSettings,
  PaymentStatus,
} from "@/domain/checkin/types";

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
  },
);

export type CheckinWizardMode = "create" | "edit";

export type CheckinWizardEditState = {
  checkinId: string;
  guests: CheckinGuestInput[];
  paymentStatus: PaymentStatus;
  paymentAmountPaid: number;
  depositAmount: number;
  keysHandedRooms: string[];
  notes: string;
};

type Props = {
  bookingId: string;
  open: boolean;
  mode?: CheckinWizardMode;
  onClose: () => void;
  onSuccess?: () => void;
  /** When provided, skips the server fetch (e.g. booking detail page). */
  booking?: BookingForCheckin;
  settings?: CheckinSettings;
  editState?: CheckinWizardEditState;
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
  mode = "create",
  onClose,
  onSuccess,
  booking: prefetchedBooking,
  settings: prefetchedSettings,
  editState: prefetchedEditState,
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
    editState: prefetchedEditState,
  });

  const hasPrefetch = !!(prefetchedBooking && prefetchedSettings);

  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<{
    booking: BookingForCheckin;
    settings: CheckinSettings;
    editState?: CheckinWizardEditState;
    partialPayment?: CheckinWizardContextResult["partialPayment"];
    ledgerCollectedHint?: string;
  } | null>(
    hasPrefetch
      ? {
          booking: prefetchedBooking!,
          settings: prefetchedSettings!,
          editState: prefetchedEditState,
        }
      : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
    onSuccessRef.current = onSuccess;
    showToastRef.current = showToast;
    tRef.current = t;
    tCommonRef.current = tCommon;
    prefetchRef.current = {
      booking: prefetchedBooking,
      settings: prefetchedSettings,
      editState: prefetchedEditState,
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

    const { booking: prefetchBooking, settings: prefetchSettings, editState } =
      prefetchRef.current;

    if (prefetchBooking && prefetchSettings) {
      setContext({
        booking: prefetchBooking,
        settings: prefetchSettings,
        editState,
      });
    } else {
      setContext(null);
    }

    let cancelled = false;
    setLoading(true);

    void loadCheckinWizardContextAction(bookingId, {
      edit: mode === "edit",
    }).then((res) => {
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

      if (
        mode === "create" &&
        (res.roomCheckinComplete ?? res.hasExistingCheckin)
      ) {
        showToastRef.current({
          kind: "info",
          title: tRef.current("title"),
          message: tRef.current("alreadyCheckedIn"),
        });
        onSuccessRef.current?.();
        onCloseRef.current();
        return;
      }

      if (mode === "edit" && !res.editContext) {
        showToastRef.current({
          kind: "error",
          title: tCommonRef.current("error"),
          message: tRef.current("noCheckinToEdit"),
        });
        onCloseRef.current();
        return;
      }

      if (res.booking && res.settings) {
        setContext((prev) => ({
          booking: res.booking!,
          settings: res.settings!,
          editState: res.editContext ?? prev?.editState,
          partialPayment: res.partialPayment ?? prev?.partialPayment,
          ledgerCollectedHint: res.partialPayment?.ledgerCollectedHint,
        }));
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
  }, [open, bookingId, mode]);

  if (!open) return null;

  const ready = !!context && !loading;
  const panelTitle = mode === "edit" ? t("editTitle") : t("title");

  return (
    <AdminFloatingPanel
      open
      onClose={onClose}
      title={panelTitle}
      variant="modal"
      width={680}
      className="checkin-modal"
    >
      {ready ? (
        <CheckinStepper
          key={`${bookingId}:${context.editState?.paymentStatus ?? context.partialPayment?.paymentStatus ?? "new"}:${context.editState?.paymentAmountPaid ?? context.partialPayment?.paymentAmountPaid ?? 0}`}
          booking={context.booking}
          settings={context.settings}
          mode={mode}
          checkinId={context.editState?.checkinId}
          initialGuests={context.editState?.guests}
          initialPaymentStatus={
            context.editState?.paymentStatus ??
            context.partialPayment?.paymentStatus
          }
          initialPaymentAmountPaid={
            context.editState?.paymentAmountPaid ??
            context.partialPayment?.paymentAmountPaid
          }
          initialDepositAmount={
            context.editState?.depositAmount ??
            context.partialPayment?.depositAmount
          }
          ledgerCollectedHint={context.ledgerCollectedHint}
          initialKeysHandedRooms={context.editState?.keysHandedRooms}
          initialNotes={context.editState?.notes}
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

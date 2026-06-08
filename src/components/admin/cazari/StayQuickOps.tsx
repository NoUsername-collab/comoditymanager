"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { shiftBookingOnGanttAction } from "@/app/[locale]/admin/(panel)/calendar/actions";
import { canOfferOperativeCheckIn } from "@/domain/booking/operative-checkin";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { todayIso } from "@/lib/stay-dates";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  bookingStatus: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  labels: {
    checkIn: string;
    checkOut: string;
    edit: string;
    movePrevDay: string;
    moveNextDay: string;
    checkoutNeedsCheckin: string;
    checkoutAlreadyDone: string;
    checkActionsOnlyConfirmed: string;
    moveOnlyConfirmed: string;
    phoneRequiredForCheckIn: string;
  };
  guestPhone?: string | null;
};

export function StayQuickOps({
  bookingId,
  bookingStatus,
  guestName,
  plannedCheckIn,
  plannedCheckOut,
  actualCheckInAt,
  actualCheckOutAt,
  labels,
  guestPhone,
}: Props) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const [pending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<{
    mode: "checkin" | "checkout";
    intent: "set" | "edit";
  } | null>(null);
  const isConfirmed = bookingStatus === "confirmata";
  const hasPhone = isValidGuestPhone(guestPhone);
  const canCheckIn =
    canOfferOperativeCheckIn({
      status: bookingStatus,
      plannedCheckIn,
      today: todayIso(),
      actualCheckInAt,
      actualCheckOutAt,
    }) && hasPhone;
  const canCheckOut = isConfirmed && !!actualCheckInAt && !actualCheckOutAt;
  const canEditCheckIn = isConfirmed && !!actualCheckInAt;
  const canEditCheckOut = isConfirmed && !!actualCheckOutAt;
  const canMove = isConfirmed;
  const checkInLabel = canEditCheckIn
    ? `${labels.edit} ${labels.checkIn}`
    : labels.checkIn;
  const checkOutLabel = canEditCheckOut
    ? `${labels.edit} ${labels.checkOut}`
    : labels.checkOut;

  const checkoutTitle = !isConfirmed
    ? labels.checkActionsOnlyConfirmed
    : canEditCheckOut
      ? ""
      : actualCheckOutAt
      ? labels.checkoutAlreadyDone
      : !actualCheckInAt
        ? labels.checkoutNeedsCheckin
        : "";

  function moveStay(dayDelta: number) {
    if (!canMove || pending) return;
    startTransition(async () => {
      const res = await shiftBookingOnGanttAction(bookingId, dayDelta);
      if (!res.ok) {
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: dayDelta > 0 ? labels.moveNextDay : labels.movePrevDay,
        message: guestName,
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={(!canCheckIn && !canEditCheckIn) || pending}
        title={
          !isConfirmed
            ? labels.checkActionsOnlyConfirmed
            : !hasPhone
              ? labels.phoneRequiredForCheckIn
              : ""
        }
        onClick={() =>
          setDialogState({
            mode: "checkin",
            intent: canEditCheckIn ? "edit" : "set",
          })
        }
      >
        {checkInLabel}
      </button>
      <button
        type="button"
        className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-900 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={(!canCheckOut && !canEditCheckOut) || pending}
        title={checkoutTitle}
        onClick={() =>
          setDialogState({
            mode: "checkout",
            intent: canEditCheckOut ? "edit" : "set",
          })
        }
      >
        {checkOutLabel}
      </button>
      <button
        type="button"
        className="rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canMove || pending}
        title={!canMove ? labels.moveOnlyConfirmed : ""}
        onClick={() => moveStay(-1)}
      >
        -1d
      </button>
      <button
        type="button"
        className="rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-[11px] font-bold text-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!canMove || pending}
        title={!canMove ? labels.moveOnlyConfirmed : ""}
        onClick={() => moveStay(1)}
      >
        +1d
      </button>
      <Link
        href={`/admin/bookings/${bookingId}`}
        className="rounded bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
      >
        {labels.edit}
      </Link>

      <GanttCheckTimeDialog
        open={dialogState !== null}
        mode={dialogState?.mode ?? "checkin"}
        intent={dialogState?.intent ?? "set"}
        bookingId={bookingId}
        guestName={guestName}
        plannedCheckIn={plannedCheckIn}
        plannedCheckOut={plannedCheckOut}
        onClose={() => setDialogState(null)}
        onSuccess={() => {
          setDialogState(null);
          router.refresh();
        }}
      />
    </div>
  );
}

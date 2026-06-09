"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { TouristSheetLauncher } from "@/components/admin/checkin/TouristSheetLauncher";
import { useOperativeCheck } from "@/components/admin/operative/OperativeCheckProvider";
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
  hasCheckIn?: boolean;
  emitFisaLabel?: string;
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
  hasCheckIn = false,
  emitFisaLabel,
}: Props) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const { openCheckInWizard, openCheckOut } = useOperativeCheck();
  const [pending, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState<{
    mode: "checkin" | "checkout";
  } | null>(null);
  const isConfirmed = bookingStatus === "confirmata";
  const hasPhone = isValidGuestPhone(guestPhone);
  const operativeArgs = {
    bookingId,
    guestName,
    plannedCheckIn,
    plannedCheckOut,
    status: bookingStatus,
    actualCheckInAt,
    actualCheckOutAt,
  };
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

  function handleCheckIn() {
    if (canEditCheckIn) {
      setEditDialog({ mode: "checkin" });
      return;
    }
    openCheckInWizard(operativeArgs);
  }

  function handleCheckOut() {
    if (canEditCheckOut) {
      setEditDialog({ mode: "checkout" });
      return;
    }
    openCheckOut(operativeArgs);
  }

  return (
    <div className="stay-quick-ops flex flex-wrap items-center justify-end gap-1.5">
      <button
        type="button"
        className="checkin-start-btn stay-quick-ops__checkin !px-2 !py-1 !text-[11px]"
        disabled={(!canCheckIn && !canEditCheckIn) || pending}
        title={
          !isConfirmed
            ? labels.checkActionsOnlyConfirmed
            : !hasPhone
              ? labels.phoneRequiredForCheckIn
              : ""
        }
        onClick={handleCheckIn}
      >
        {!canEditCheckIn && (
          <span className="checkin-start-btn__icon" aria-hidden>
            🔑
          </span>
        )}
        {checkInLabel}
      </button>
      <button
        type="button"
        className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-900 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={(!canCheckOut && !canEditCheckOut) || pending}
        title={checkoutTitle}
        onClick={handleCheckOut}
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
      {hasCheckIn && emitFisaLabel ? (
        <TouristSheetLauncher bookingId={bookingId} label={emitFisaLabel} />
      ) : null}
      <Link
        href={`/admin/bookings/${bookingId}`}
        className="rounded bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
      >
        {labels.edit}
      </Link>

      {editDialog ? (
        <GanttCheckTimeDialog
          open
          mode={editDialog.mode}
          intent="edit"
          bookingId={bookingId}
          guestName={guestName}
          plannedCheckIn={plannedCheckIn}
          plannedCheckOut={plannedCheckOut}
          actualCheckInAt={actualCheckInAt}
          actualCheckOutAt={actualCheckOutAt}
          onClose={() => setEditDialog(null)}
          onSuccess={() => {
            setEditDialog(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

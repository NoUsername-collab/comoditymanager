"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { TouristSheetLauncher } from "@/components/admin/checkin/TouristSheetLauncher";
import { useOperativeCheck } from "@/components/admin/operative/OperativeCheckProvider";
import { shiftBookingOnGanttAction } from "@/app/[locale]/admin/(panel)/calendar/actions";
import {
  canOfferOperativeCheckIn,
  isOperativeCheckInDay,
} from "@/domain/booking/operative-checkin";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
  bookingStatus: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  roomNames?: string[];
  checkedInRooms?: string[];
  labels: {
    checkIn: string;
    checkInContinue: string;
    checkInNextRoom: string;
    checkOut: string;
    edit: string;
    movePrevDay: string;
    moveNextDay: string;
    checkoutNeedsCheckin: string;
    checkoutAlreadyDone: string;
    checkActionsOnlyConfirmed: string;
    moveOnlyConfirmed: string;
    phoneRequiredForCheckIn: string;
    completeCheckinForFisa: string;
    /** Pre-rezolvat pe server — nu trimite funcții la client. */
    checkInArrivalDayHint: string;
  };
  guestPhone?: string | null;
  hasCheckinRecord?: boolean;
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
  roomNames = [],
  checkedInRooms = [],
  labels,
  guestPhone,
  hasCheckinRecord = false,
  emitFisaLabel,
}: Props) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const { showToast } = useAdminFx();
  const { today, openCheckInWizard, openCheckOut } = useOperativeCheck();
  const [pending, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState<{
    mode: "checkin" | "checkout";
  } | null>(null);
  const isConfirmed = bookingStatus === "confirmata";
  const hasPhone = isValidGuestPhone(guestPhone);
  const isArrivalDay = isOperativeCheckInDay(plannedCheckIn, today);
  const roomProgress = computeRoomCheckinProgress(roomNames, checkedInRooms);
  const operativeArgs = {
    bookingId,
    guestName,
    plannedCheckIn,
    plannedCheckOut,
    status: bookingStatus,
    actualCheckInAt,
    actualCheckOutAt,
    hasCheckinRecord,
    roomNames,
    checkedInRooms,
    today,
  };
  const canEmitFisa = hasCheckinRecord && roomProgress.isComplete;
  const canWizardCheckIn =
    canOfferOperativeCheckIn({
      status: bookingStatus,
      plannedCheckIn,
      today,
      actualCheckInAt,
      actualCheckOutAt,
      hasCheckinRecord,
      roomNames,
      checkedInRooms,
    }) && hasPhone;
  const needsWizardForFisa =
    canWizardCheckIn && !!actualCheckInAt && !hasCheckinRecord;
  const canNewCheckIn = canWizardCheckIn && !actualCheckInAt;
  const canContinueRooms =
    canWizardCheckIn && roomProgress.isPartial && roomProgress.remaining > 0;
  const canCheckOut =
    isConfirmed && !!actualCheckInAt && !actualCheckOutAt && roomProgress.isComplete;
  const canEditCheckInTime =
    isConfirmed && !!actualCheckInAt && hasCheckinRecord && roomProgress.isComplete;
  const canMove = isConfirmed;
  const checkInEnabled =
    canNewCheckIn || canContinueRooms || needsWizardForFisa || canEditCheckInTime;

  const canEditCheckOut = isConfirmed && !!actualCheckOutAt;

  const checkInLabel = needsWizardForFisa
    ? labels.completeCheckinForFisa
    : canEditCheckInTime
      ? `${labels.edit} ${labels.checkIn}`
      : canContinueRooms
        ? roomProgress.remaining === 1
          ? labels.checkInNextRoom
          : labels.checkInContinue
        : labels.checkIn;

  const checkOutLabel = canEditCheckOut
    ? `${labels.edit} ${labels.checkOut}`
    : labels.checkOut;

  const checkInTitle = !isConfirmed
    ? labels.checkActionsOnlyConfirmed
    : canEditCheckInTime
      ? ""
      : !hasPhone
        ? labels.phoneRequiredForCheckIn
        : !isArrivalDay && !canContinueRooms
          ? labels.checkInArrivalDayHint
          : "";

  const checkoutTitle = !isConfirmed
    ? labels.checkActionsOnlyConfirmed
    : canEditCheckOut
      ? ""
      : actualCheckOutAt
        ? labels.checkoutAlreadyDone
        : !actualCheckInAt
          ? labels.checkoutNeedsCheckin
          : !roomProgress.isComplete
            ? labels.checkInContinue
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
    if (canEditCheckInTime) {
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
        className={[
          "checkin-start-btn stay-quick-ops__checkin !px-2 !py-1 !text-[11px]",
          canContinueRooms && "checkin-start-btn--continue",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={!checkInEnabled || pending}
        title={checkInTitle}
        onClick={handleCheckIn}
      >
        {!canEditCheckInTime && (
          <span className="checkin-start-btn__icon" aria-hidden>
            {canContinueRooms ? "🛏" : "🔑"}
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
      {canEmitFisa && emitFisaLabel ? (
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

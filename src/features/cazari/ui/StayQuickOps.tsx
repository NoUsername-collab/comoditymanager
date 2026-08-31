"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { BookingCheckoutPanel } from "@/features/bookings/ui/BookingCheckoutPanel";
import { TouristSheetLauncher } from "@/features/checkin/ui/TouristSheetLauncher";
import { useOperativeCheck } from "@/components/admin/operative/OperativeCheckProvider";
import { shiftBookingOnGanttAction } from "@/features/calendar/actions";
import {
  canOfferOperativeCheckIn,
  isOperativeCheckInDay,
} from "@/domain/booking/operative-checkin";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { isValidGuestPhone } from "@/domain/guest/normalize";
import { deferGanttBackgroundRefresh } from "@/lib/gantt/live-bookings";
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
  const tServer = useTranslations("admin.serverActions");
  const { showToast } = useAdminFx();
  const { today, openCheckInWizard, openCheckOut, canEditAfterCheckout } =
    useOperativeCheck();
  const [pending, startTransition] = useTransition();
  const [editCheckOutOpen, setEditCheckOutOpen] = useState(false);
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
  const postCheckoutLocked = !!actualCheckOutAt && !canEditAfterCheckout;
  const canEditCheckInTimeEffective =
    canEditCheckInTime && !postCheckoutLocked;
  const canMove =
    isConfirmed && (!actualCheckOutAt || canEditAfterCheckout);
  const checkInEnabled =
    canNewCheckIn || canContinueRooms || needsWizardForFisa || canEditCheckInTimeEffective;

  const canEditCheckOut = isConfirmed && !!actualCheckOutAt;
  const canEditCheckOutEffective = canEditCheckOut && !postCheckoutLocked;
  const checkoutLockedTitle = postCheckoutLocked ? tServer("checkoutLocked") : "";

  const checkInLabel = needsWizardForFisa
    ? labels.completeCheckinForFisa
    : canEditCheckInTimeEffective
      ? `${labels.edit} ${labels.checkIn}`
      : canContinueRooms
        ? roomProgress.remaining === 1
          ? labels.checkInNextRoom
          : labels.checkInContinue
        : labels.checkIn;

  const checkOutLabel = canEditCheckOutEffective
    ? `${labels.edit} ${labels.checkOut}`
    : labels.checkOut;

  const checkInTitle = !isConfirmed
    ? labels.checkActionsOnlyConfirmed
    : postCheckoutLocked
      ? checkoutLockedTitle
      : canEditCheckInTimeEffective
        ? ""
      : !hasPhone
        ? labels.phoneRequiredForCheckIn
        : !isArrivalDay && !canContinueRooms
          ? labels.checkInArrivalDayHint
          : "";

  const checkoutTitle = !isConfirmed
    ? labels.checkActionsOnlyConfirmed
    : postCheckoutLocked
      ? checkoutLockedTitle
      : canEditCheckOutEffective
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
      deferGanttBackgroundRefresh(router);
    });
  }

  function handleCheckIn() {
    if (postCheckoutLocked) return;
    if (canEditCheckInTimeEffective) {
      openCheckInWizard({ ...operativeArgs, editExisting: true });
      return;
    }
    openCheckInWizard(operativeArgs);
  }

  function handleCheckOut() {
    if (postCheckoutLocked) return;
    if (canEditCheckOutEffective) {
      setEditCheckOutOpen(true);
      return;
    }
    openCheckOut(operativeArgs);
  }

  return (
    <>
      <div className="stay-quick-ops">
        <div className="stay-quick-ops__primary">
          <button
            type="button"
            className={[
              "checkin-start-btn stay-quick-ops__checkin stay-quick-ops__btn",
              canContinueRooms && "checkin-start-btn--continue",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={!checkInEnabled || pending}
            title={checkInTitle}
            onClick={handleCheckIn}
          >
            {!canEditCheckInTimeEffective && (
              <span className="checkin-start-btn__icon" aria-hidden>
                {canContinueRooms ? "🛏" : "🔑"}
              </span>
            )}
            {checkInLabel}
          </button>
          <button
            type="button"
            className="stay-quick-ops__btn stay-quick-ops__checkout"
            disabled={(!canCheckOut && !canEditCheckOutEffective) || pending}
            title={checkoutTitle}
            onClick={handleCheckOut}
          >
            {checkOutLabel}
          </button>
        </div>

        <div
          className="stay-quick-ops__shift-pair"
          role="group"
          aria-label={`${labels.movePrevDay} / ${labels.moveNextDay}`}
        >
          <button
            type="button"
            className="stay-quick-ops__btn stay-quick-ops__shift"
            disabled={!canMove || pending}
            title={!canMove ? labels.moveOnlyConfirmed : labels.movePrevDay}
            aria-label={labels.movePrevDay}
            onClick={() => moveStay(-1)}
          >
            -1d
          </button>
          <button
            type="button"
            className="stay-quick-ops__btn stay-quick-ops__shift"
            disabled={!canMove || pending}
            title={!canMove ? labels.moveOnlyConfirmed : labels.moveNextDay}
            aria-label={labels.moveNextDay}
            onClick={() => moveStay(1)}
          >
            +1d
          </button>
        </div>

        <div className="stay-quick-ops__tertiary">
          {canEmitFisa && emitFisaLabel ? (
            <TouristSheetLauncher
              bookingId={bookingId}
              label={emitFisaLabel}
              className="stay-quick-ops__btn stay-quick-ops__fisa"
            />
          ) : null}
          <Link
            href={`/admin/bookings/${bookingId}`}
            className="stay-quick-ops__btn stay-quick-ops__edit"
          >
            {labels.edit}
          </Link>
        </div>
      </div>

      {editCheckOutOpen ? (
        <BookingCheckoutPanel
          open
          intent="edit"
          bookingId={bookingId}
          guestName={guestName}
          plannedCheckIn={plannedCheckIn}
          plannedCheckOut={plannedCheckOut}
          actualCheckOutAt={actualCheckOutAt}
          onClose={() => setEditCheckOutOpen(false)}
          onSuccess={() => {
            setEditCheckOutOpen(false);
            deferGanttBackgroundRefresh(router);
          }}
        />
      ) : null}
    </>
  );
}

import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { BookingCancelButton } from "@/components/admin/BookingCancelButton";
import { StayQuickOps } from "@/components/admin/cazari/StayQuickOps";
import { cancelBookingAction } from "@/app/[locale]/admin/(panel)/bookings/actions";
import type { CazariLabels, OperationalStay } from "@/components/admin/cazari/types";

export function StayActions({
  stay,
  returnTo,
  labels,
}: {
  stay: OperationalStay;
  returnTo: string;
  labels: CazariLabels;
}) {
  const period = formatStayPeriod(stay.check_in, stay.check_out, true);
  const ref = formatBookingRef(stay.id);
  const cancelMessage =
    stay.status === "confirmata"
      ? labels.cancelConfirmedMsg(ref, stay.guest_name, period)
      : labels.cancelRequestMsg(ref, stay.guest_name, period);

  return (
    <div className="stay-card__actions">
      <StayQuickOps
        bookingId={stay.id}
        bookingStatus={stay.status}
        guestName={stay.guest_name}
        guestPhone={stay.guest_phone}
        plannedCheckIn={stay.check_in}
        plannedCheckOut={stay.check_out}
        actualCheckInAt={stay.actual_check_in_at}
        actualCheckOutAt={stay.actual_check_out_at}
        roomNames={stay.room_names}
        checkedInRooms={stay.checked_in_rooms ?? []}
        labels={{
          checkIn: labels.checkIn,
          checkInContinue: labels.checkInContinue,
          checkInNextRoom: labels.checkInNextRoom,
          checkOut: labels.checkout,
          edit: labels.edit,
          movePrevDay: labels.movePrevDay,
          moveNextDay: labels.moveNextDay,
          checkoutNeedsCheckin: labels.checkoutNeedsCheckin,
          checkoutAlreadyDone: labels.checkoutAlreadyDone,
          checkActionsOnlyConfirmed: labels.checkActionsOnlyConfirmed,
          moveOnlyConfirmed: labels.moveOnlyConfirmed,
          phoneRequiredForCheckIn: labels.phoneRequiredForCheckIn,
          completeCheckinForFisa: labels.completeCheckinForFisa,
          checkInArrivalDayHint: labels.checkInOnlyOnArrivalDay(stay.check_in),
        }}
        hasCheckinRecord={!!stay.has_checkin_record}
        emitFisaLabel={labels.emitFisa}
      />
      <div className="stay-card__danger-zone">
        <BookingCancelButton
        label={
          stay.status === "confirmata" ? labels.cancelStay : labels.cancelRequest
        }
        confirmMessage={cancelMessage}
        formAction={cancelBookingAction}
        bookingId={stay.id}
        returnTo={returnTo}
        variant="compact"
        />
      </div>
    </div>
  );
}

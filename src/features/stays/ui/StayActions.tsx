import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { formatStayLabel } from "@/lib/stay-label-format";
import { BookingCancelButton } from "@/features/bookings/ui/BookingCancelButton";
import { StayQuickOpsLazy } from "@/features/stays/ui/StayQuickOpsLazy";
import { cancelBookingAction } from "@/features/bookings/actions";
import type { StayListLabels, OperationalStay } from "@/features/stays/ui/types";

export function StayActions({
  stay,
  returnTo,
  labels,
}: {
  stay: OperationalStay;
  returnTo: string;
  labels: StayListLabels;
}) {
  const period = formatStayPeriod(stay.check_in, stay.check_out, true);
  const ref = formatBookingRef(stay.id);
  const cancelMessage =
    stay.status === "confirmata"
      ? formatStayLabel(labels.cancelConfirmedMsg, {
          ref,
          name: stay.guest_name,
          period,
        })
      : formatStayLabel(labels.cancelRequestMsg, {
          ref,
          name: stay.guest_name,
          period,
        });

  return (
    <div className="stay-card__actions">
      <StayQuickOpsLazy
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
          completeCheckinForTouristSheet: labels.completeCheckinForTouristSheet,
          checkInArrivalDayHint: formatStayLabel(
            labels.checkInOnlyOnArrivalDay,
            { date: stay.check_in },
          ),
        }}
        hasCheckinRecord={!!stay.has_checkin_record}
        emitTouristSheetLabel={labels.emitTouristSheet}
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
        operative
        />
      </div>
    </div>
  );
}

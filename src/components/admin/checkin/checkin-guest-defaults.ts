import {
  assignRegisteredGuestsToRooms,
  bookingRooms,
  buildCheckinGuestSlots,
  defaultOperatorScope,
  effectiveIdentityScope,
} from "@/domain/checkin/guest-layout";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  CheckinSettings,
} from "@/domain/checkin/types";

export function createInitialCheckinGuests(
  booking: BookingForCheckin,
  settings: CheckinSettings,
): CheckinGuestInput[] {
  const registered = booking.registered_guests ?? [];
  if (registered.length > 0) {
    const scope = effectiveIdentityScope(
      settings.group_checkin_mode,
      defaultOperatorScope(settings.group_checkin_mode),
    );
    if (scope === "rep") {
      const rep =
        registered.find((g) => g.is_representative) ?? registered[0];
      const rooms = bookingRooms(booking);
      return [{ ...rep, room_label: rooms[0], is_representative: true }];
    }
    if (scope === "per_room") {
      return assignRegisteredGuestsToRooms(registered, bookingRooms(booking));
    }
    return registered.map((g, i) => ({
      ...g,
      is_representative: g.is_representative || i === 0,
    }));
  }

  return buildCheckinGuestSlots(
    booking,
    defaultOperatorScope(settings.group_checkin_mode),
  );
}

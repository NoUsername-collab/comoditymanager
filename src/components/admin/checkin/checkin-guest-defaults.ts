import {
  buildCheckinGuestSlots,
  defaultOperatorScope,
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
  return buildCheckinGuestSlots(booking, defaultOperatorScope(settings.group_checkin_mode));
}

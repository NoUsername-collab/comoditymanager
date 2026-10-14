import { formatGuestFullName } from "@/domain/guest-name";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";
import {
  assertValidGuestPhone,
  normalizeEmail,
  normalizePhone,
} from "@/domain/guest/normalize";
import { parseGuestTags } from "@/domain/guest/tags";
import type {
  GuestDocType,
  GuestHighlights,
  GuestBookingInput,
  GuestIdentityStatus,
  GuestListItem,
  GuestNationalIdType,
  GuestRow,
  GuestSearchFilter,
  GuestSearchResult,
  GuestSex,
  GuestStayReviewRow,
  GuestTag,
} from "@/domain/guest/types";
import { GUEST_MATCH_PRIORITY } from "@/domain/guest/matching-contract";
import type { BookingStatus } from "@/domain/booking/types";
import type { BookingRoomSegmentRow } from "@/domain/booking/segment-types";
import { stayNightCount } from "@/lib/stay-dates";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { mapGuestRow } from "@/domain/guest/map-row";
import {
  ensureGuestProfiles,
  getGuestProfile,
  listGuestProfileSummaries,
  listGuestStayReviewsByBookingIds,
  mergeGuestProfiles,
} from "@/services/guest-profiles";

import { getGuestBaseById } from "./lookup";
import { assertRoomsAvailableForStay } from "@/services/bookings/availability";
import { getLatestBookingForGuest } from "@/services/bookings";
import { getRoomsByIds } from "@/services/rooms-admin";
import {
  partyFromBooking,
  partyYearsLater,
  type Party,
} from "@/domain/availability/party";
import { quoteStayForRooms } from "@/services/stay-quote";

/** Whole calendar years between two stays, so the children are as old as on the new dates. */
function yearsBetween(fromIso: string, toIso: string): number {
  return Number(toIso.slice(0, 4)) - Number(fromIso.slice(0, 4));
}

/** Same rooms on new dates: free, still hosting the (older) family, priced like any stay. */
async function validateRebookRoomsAndEstimateTotal(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  party: Party
): Promise<number | null> {
  if (roomIds.length === 0) return null;
  const [, quote] = await Promise.all([
    assertRoomsAvailableForStay(checkIn, checkOut, roomIds),
    quoteStayForRooms({ party, roomIds, checkIn, checkOut }),
  ]);
  return quote.total;
}

export async function rebookGuestLastStay(guestId: string): Promise<string> {
  const [guest, last] = await Promise.all([
    getGuestBaseById(guestId),
    getLatestBookingForGuest(guestId),
  ]);
  if (!guest) throw new Error("guest.not_found");
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const shifted = shiftStayToNextFutureYear(last.check_in, last.check_out);
  const roomIds = last.room_ids;

  const party = partyYearsLater(
    partyFromBooking(last),
    yearsBetween(last.check_in, shifted.check_in)
  );
  const total = await validateRebookRoomsAndEstimateTotal(
    shifted.check_in,
    shifted.check_out,
    roomIds,
    party
  );

  const { createBookingRequest } = await import("@/services/bookings");
  const bookingId = await createBookingRequest({
    check_in: shifted.check_in,
    check_out: shifted.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    party,
    notes: `[Rebook] Ultimul sejur (${last.check_in} → ${last.check_out})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook ultimul sejur: ${guest.display_name}`,
    metadata: {
      guest_id: guestId,
      source_booking_id: last.id,
      check_in: shifted.check_in,
      check_out: shifted.check_out,
    },
  });

  return bookingId;
}

export async function rebookGuestSamePeriodNextYear(
  guestId: string
): Promise<string> {
  const [guest, last] = await Promise.all([
    getGuestBaseById(guestId),
    getLatestBookingForGuest(guestId),
  ]);
  if (!guest) throw new Error("guest.not_found");
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const shifted = shiftStayDatesByYears(last.check_in, last.check_out, 1);
  const roomIds = last.room_ids;

  const party = partyYearsLater(
    partyFromBooking(last),
    yearsBetween(last.check_in, shifted.check_in)
  );
  const total = await validateRebookRoomsAndEstimateTotal(
    shifted.check_in,
    shifted.check_out,
    roomIds,
    party
  );

  const { createBookingRequest } = await import("@/services/bookings");
  const bookingId = await createBookingRequest({
    check_in: shifted.check_in,
    check_out: shifted.check_out,
    guest_name: guest.display_name,
    guest_last_name: guest.last_name,
    guest_first_name: guest.first_name,
    guest_email: guest.email ?? last.guest_email,
    guest_phone: guest.phone ?? last.guest_phone ?? "",
    party,
    notes: `[Rebook] Aceeași perioadă an viitor (din ${last.check_in})`,
    total_price: total,
    room_ids: roomIds.length > 0 ? roomIds : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook an viitor: ${guest.display_name}`,
    metadata: {
      guest_id: guestId,
      source_booking_id: last.id,
      check_in: shifted.check_in,
      check_out: shifted.check_out,
    },
  });

  return bookingId;
}


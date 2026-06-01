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

async function estimateTotalForRooms(
  checkIn: string,
  checkOut: string,
  roomIds: string[]
): Promise<number | null> {
  if (roomIds.length === 0) return null;
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("rooms")
    .select("price_per_night")
    .eq("tenant_id", tenantId)
    .in("id", roomIds);
  if (error) throw new Error(error.message);
  const nights = stayNightCount(checkIn, checkOut);
  const raw = (data ?? []).reduce(
    (sum, r) => sum + Number(r.price_per_night) * nights,
    0
  );
  return Math.round(raw * 100) / 100;
}

async function getLastGuestBooking(guestId: string) {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("guest_id", guestId)
    .neq("status", "anulata")
    .order("check_out", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { getBookingById } = await import("@/services/bookings");
  return getBookingById(data.id);
}

export async function rebookGuestLastStay(guestId: string): Promise<string> {
  const guest = await getGuestBaseById(guestId);
  if (!guest) throw new Error("guest.not_found");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const shifted = shiftStayToNextFutureYear(last.check_in, last.check_out);
  const roomIds = last.room_ids;

  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(
      shifted.check_in,
      shifted.check_out,
      roomIds
    );
  }

  const total = await estimateTotalForRooms(
    shifted.check_in,
    shifted.check_out,
    roomIds
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
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
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
  const guest = await getGuestBaseById(guestId);
  if (!guest) throw new Error("guest.not_found");

  const last = await getLastGuestBooking(guestId);
  if (!last) {
    throw new Error("guest.no_previous_stay_for_rebook");
  }

  const shifted = shiftStayDatesByYears(last.check_in, last.check_out, 1);
  const roomIds = last.room_ids;

  if (roomIds.length > 0) {
    await assertRoomsAvailableForStay(
      shifted.check_in,
      shifted.check_out,
      roomIds
    );
  }

  const total = await estimateTotalForRooms(
    shifted.check_in,
    shifted.check_out,
    roomIds
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
    num_adults: last.num_adults,
    num_children: last.num_children,
    has_minor: last.has_minor,
    minor_age: last.minor_age ?? "",
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


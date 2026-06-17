import { unstable_cache } from "next/cache";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  shiftAllSegmentsByDays,
  syncBookingRoomSegments,
} from "@/services/booking-segments";
import {
  assertValidGuestPhone,
  isValidGuestPhone,
  normalizePhone,
} from "@/domain/guest/normalize";
import { resolveGuestForBooking } from "@/services/guest-booking-resolve";
import {
  listGuestProfileSummaries,
  resolveGuestAlertSnapshot,
} from "@/services/guest-profiles";
import {
  assertRoomsAvailableForOccupancy,
} from "@/services/room-occupancy";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { parseOperationalTimestamp } from "@/lib/operational-check";

import { getBookingById } from "./queries";
import { assertPostCheckoutEditAllowed } from "./post-checkout-guard";
import { createBookingRequest } from "./create";

export async function confirmBookingWithRooms(
  bookingId: string,
  roomIds: string[],
  totalPrice: number
): Promise<void> {
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    throw new Error("booking.total_price_required_on_confirm");
  }
  const { assertRoomsAssignableForBooking } = await import(
    "@/services/booking-confirm"
  );
  await assertRoomsAssignableForBooking(bookingId, roomIds);

  const [{ tenantId, supabase }, booking, simActive] = await Promise.all([
    getTenantScope(),
    getBookingById(bookingId),
    isSimActive(),
  ]);
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "confirmata") throw new Error("booking.already_confirmed");
  if (booking.status !== "cerere_noua" && booking.status !== "anulata") {
    throw new Error("booking.request_not_found");
  }

  if (simActive) {
    // Simulation mode: use individual operations on sim_sandbox schema.
    // Atomicity is not critical for throwaway simulation data.

    await supabase
      .from("booking_rooms")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId);

    const { error: brError } = await supabase.from("booking_rooms").insert(
      roomIds.map((room_id) =>
        withTenantId(tenantId, {
          booking_id: bookingId,
          room_id,
          extra_beds: 0,
        })
      )
    );
    if (brError) throw new Error(brError.message);

    const { error: upError } = await supabase
      .from("bookings")
      .update({
        status: "confirmata",
        total_price: totalPrice,
        confirmed_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", bookingId);

    if (upError) throw new Error(upError.message);

    await syncBookingRoomSegments(bookingId);
  } else {
    // Production: use atomic RPC — all DB operations run in a single
    // transaction so a crash can never orphan room assignments.
    const supabase = createPublicAdminClient();

    const { error: rpcError } = await supabase.rpc(
      "confirm_booking_with_rooms",
      {
        p_booking_id: bookingId,
        p_room_ids: roomIds,
        p_total_price: totalPrice,
        p_tenant_id: tenantId,
      }
    );
    if (rpcError) throw new Error(rpcError.message);
  }

  await logAdminActivityFromSession({
    action: "booking.confirmed",
    entityType: "booking",
    entityId: bookingId,
    summary: `Confirmată: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      previous_status: booking.status,
      room_ids: roomIds,
      total_price: totalPrice,
      check_in: booking.check_in,
      check_out: booking.check_out,
    },
  });

  const { issueGuestAccessForBooking } = await import(
    "@/services/guest-app/access"
  );
  await issueGuestAccessForBooking(bookingId).catch(() => null);
}

export async function rescheduleBookingDates(
  bookingId: string,
  newCheckIn: string,
  newCheckOut: string
): Promise<void> {
  if (!isAtLeastOneNight(newCheckIn, newCheckOut)) {
    throw new Error("booking.minimum_one_night_required");
  }

  const [booking, { tenantId, supabase }] = await Promise.all([
    getBookingById(bookingId),
    getTenantScope(),
  ]);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.cannot_shift_cancelled");
  }
  if (booking.room_ids.length === 0) {
    throw new Error("booking.assign_rooms_before_shift");
  }

  await assertRoomsAvailableForOccupancy(
    newCheckIn,
    newCheckOut,
    booking.room_ids,
    bookingId
  );
  const { error } = await supabase
    .from("bookings")
    .update({
      check_in: newCheckIn,
      check_out: newCheckOut,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  const dayDelta = Math.round(
    (parseIso(newCheckIn).getTime() - parseIso(booking.check_in).getTime()) /
      86400000
  );

  if (await bookingHasSplitSegments(bookingId)) {
    await shiftAllSegmentsByDays(bookingId, dayDelta);
  } else {
    await syncBookingRoomSegments(bookingId);
  }

  await logAdminActivityFromSession({
    action: "booking.shifted",
    entityType: "booking",
    entityId: bookingId,
    summary: `Mutată: ${booking.guest_name} → ${newCheckIn} … ${newCheckOut}`,
    undoable: true,
    metadata: {
      from_check_in: booking.check_in,
      from_check_out: booking.check_out,
      to_check_in: newCheckIn,
      to_check_out: newCheckOut,
    },
  });
}

/** Prelungește (+1) sau scurtează (−1) sejurul la checkout. */
export async function adjustBookingStayNights(
  bookingId: string,
  nightDelta: number
): Promise<{ check_in: string; check_out: string }> {
  if (nightDelta === 0 || !Number.isInteger(nightDelta)) {
    throw new Error("booking.invalid_adjustment");
  }

  const [booking, scope] = await Promise.all([
    getBookingById(bookingId),
    getTenantScope(),
  ]);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.cannot_update_cancelled");
  }

  const newCheckOut = addDays(booking.check_out, nightDelta);
  if (!isAtLeastOneNight(booking.check_in, newCheckOut)) {
    throw new Error("booking.minimum_one_night_required");
  }

  if (booking.room_ids.length > 0) {
    await rescheduleBookingDates(bookingId, booking.check_in, newCheckOut);
  } else {
    const { tenantId, supabase } = scope;
    const { error } = await supabase
      .from("bookings")
      .update({ check_out: newCheckOut })
      .eq("tenant_id", tenantId)
      .eq("id", bookingId);
    if (error) throw new Error(error.message);
  }

  await logAdminActivityFromSession({
    action: "booking.shifted",
    entityType: "booking",
    entityId: bookingId,
    summary: `${nightDelta > 0 ? "Prelungit" : "Scurtat"}: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      night_delta: nightDelta,
      from_check_in: booking.check_in,
      from_check_out: booking.check_out,
      to_check_in: booking.check_in,
      to_check_out: newCheckOut,
      check_in: booking.check_in,
      check_out: newCheckOut,
    },
  });

  return { check_in: booking.check_in, check_out: newCheckOut };
}

/** Duplică sejurul ca cerere nouă (rebook similar). */
export async function duplicateBookingAsCerere(bookingId: string): Promise<string> {
  const b = await getBookingById(bookingId);
  if (!b) throw new Error("booking.not_found");
  if (b.status === "anulata") {
    throw new Error("booking.cannot_duplicate_cancelled");
  }

  const id = await createBookingRequest({
    check_in: b.check_in,
    check_out: b.check_out,
    guest_name: b.guest_name,
    guest_last_name: b.guest_last_name ?? b.guest_name.split(" ")[0] ?? "",
    guest_first_name:
      b.guest_first_name ??
      b.guest_name.split(" ").slice(1).join(" ") ??
      "",
    guest_email: b.guest_email,
    guest_phone: b.guest_phone ?? "",
    num_adults: b.num_adults,
    num_children: b.num_children,
    has_minor: b.has_minor,
    minor_age: b.minor_age ?? "",
    notes: `[Duplicat] rebook similar · sursă ${bookingId.slice(0, 8)}`,
    room_ids: b.room_ids.length > 0 ? b.room_ids : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: id,
    summary: `Duplicat (rebook): ${b.guest_name}`,
    metadata: { source_booking_id: bookingId },
  });

  return id;
}

/** Mută rezervarea cu același număr de nopți (drag pe Gantt). */
export async function shiftBookingByDays(
  bookingId: string,
  dayDelta: number
): Promise<{ check_in: string; check_out: string }> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.actual_check_out_at) {
    await assertPostCheckoutEditAllowed(bookingId);
  }

  const newCheckIn = addDays(booking.check_in, dayDelta);
  const newCheckOut = addDays(booking.check_out, dayDelta);
  await rescheduleBookingDates(bookingId, newCheckIn, newCheckOut);
  return { check_in: newCheckIn, check_out: newCheckOut };
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const [booking, { tenantId, supabase }] = await Promise.all([
    getBookingById(bookingId),
    getTenantScope(),
  ]);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status === "anulata") {
    throw new Error("booking.already_cancelled");
  }
  const { error } = await supabase
    .from("bookings")
    .update({ status: "anulata" })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);
  if (error) throw new Error(error.message);

  await syncBookingRoomSegments(bookingId);

  const { revokeGuestAccessForBooking } = await import(
    "@/services/guest-app/access"
  );
  await revokeGuestAccessForBooking(bookingId).catch(() => null);

  await logAdminActivityFromSession({
    action: "booking.cancelled",
    entityType: "booking",
    entityId: bookingId,
    summary: `Anulată: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      previous_status: booking.status,
      check_in: booking.check_in,
      check_out: booking.check_out,
      room_ids: booking.room_ids,
      total_price: booking.total_price,
    },
  });
}


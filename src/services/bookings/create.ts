import { after } from "next/server";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { assertBookingRoomAssignable } from "@/domain/booking/lifecycle-guards";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso } from "@/lib/stay-dates";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  seedBookingRoomSegments,
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

import { createServerTimer } from "@/lib/dev/server-timing";
import { getBookingById } from "./queries";
import { assertRoomsAvailableForStay } from "./availability";

export async function assignBookingRoomHold(
  bookingId: string,
  roomIds: string[],
  options?: { skipAvailabilityCheck?: boolean }
): Promise<void> {
  const booking = await getBookingById(bookingId);
  assertBookingRoomAssignable(booking);

  const unique = [...new Set(roomIds.filter(Boolean))];
  if (!options?.skipAvailabilityCheck) {
    await assertRoomsAvailableForStay(
      booking.check_in,
      booking.check_out,
      unique,
      bookingId
    );
  }

  const { tenantId, supabase } = await getTenantScope();
  const { error: delError } = await supabase
    .from("booking_rooms")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);
  if (delError) throw new Error(delError.message);

  const { error: insError } = await supabase.from("booking_rooms").insert(
    unique.map((room_id) =>
      withTenantId(tenantId, {
        booking_id: bookingId,
        room_id,
        extra_beds: 0,
      })
    )
  );
  if (insError) throw new Error(insError.message);
  await syncBookingRoomSegments(bookingId);
}

async function attachRoomsToNewBooking(
  bookingId: string,
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  tenantId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const unique = [...new Set(roomIds.filter(Boolean))];
  if (unique.length === 0) return;

  const { error: insError } = await supabase.from("booking_rooms").insert(
    unique.map((room_id) =>
      withTenantId(tenantId, {
        booking_id: bookingId,
        room_id,
        extra_beds: 0,
      }),
    ),
  );
  if (insError) throw new Error(insError.message);

  await seedBookingRoomSegments({
    bookingId,
    checkIn,
    checkOut,
    roomIds: unique,
  });
}

async function rollbackFailedBookingRequest(bookingId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  await supabase
    .from("booking_rooms")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);
  await supabase
    .from("bookings")
    .update({ status: "anulata" })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);
}

export async function createBookingRequest(input: {
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_last_name: string;
  guest_first_name: string;
  guest_email: string;
  guest_phone: string;
  num_adults: number;
  num_children: number;
  has_minor: boolean;
  minor_age: string;
  notes: string;
  total_price?: number | null;
  /** Soft hold: camere blocate provizoriu (status rămâne cerere_noua). */
  room_ids?: string[];
  /** Caller a verificat deja disponibilitatea (evită query duplicat). */
  skipAvailabilityCheck?: boolean;
  /** Link guest after insert — Gantt create must return before contact matching. */
  deferGuestLink?: boolean;
}): Promise<string> {
  const timer = createServerTimer("createBookingRequest");
  assertValidGuestPhone(input.guest_phone);

  const holdRooms = input.room_ids?.length
    ? [...new Set(input.room_ids.filter(Boolean))]
    : [];

  const availabilityPromise =
    holdRooms.length > 0 && !input.skipAvailabilityCheck
      ? assertRoomsAvailableForStay(
          input.check_in,
          input.check_out,
          holdRooms,
        )
      : Promise.resolve();

  const { tenantId, supabase } = await getTenantScope();

  let guestId: string | null = null;
  let mergeConflict = false;
  let guestAlert: { level: GuestFlagLevel; note: string | null } = {
    level: "normal",
    note: null,
  };

  if (input.deferGuestLink) {
    await availabilityPromise;
    timer.mark("scope");
  } else {
    const resolved = await resolveGuestForBooking({
      guest_name: input.guest_name,
      guest_last_name: input.guest_last_name,
      guest_first_name: input.guest_first_name,
      guest_email: input.guest_email,
      guest_phone: input.guest_phone,
    });
    guestId = resolved.guestId;
    mergeConflict = resolved.mergeConflict;
    const [, alert] = await Promise.all([
      availabilityPromise,
      resolveGuestAlertSnapshot({
        guestId,
        guestLastName: input.guest_last_name,
        guestFirstName: input.guest_first_name,
      }),
    ]);
    guestAlert = alert;
    timer.mark("resolveGuest");
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert(
      withTenantId(tenantId, {
        check_in: input.check_in,
        check_out: input.check_out,
        status: "cerere_noua",
        guest_name: input.guest_name.trim(),
        guest_last_name: input.guest_last_name.trim(),
        guest_first_name: input.guest_first_name.trim(),
        guest_email: input.guest_email.trim(),
        guest_phone: input.guest_phone.trim(),
        guest_id: guestId,
        guest_alert_level: guestAlert.level,
        guest_alert_note: guestAlert.note,
        num_adults: input.num_adults,
        num_children: input.num_children,
        has_minor: input.has_minor,
        minor_age: input.has_minor ? input.minor_age.trim() : null,
        notes: input.notes.trim() || null,
        total_price: input.total_price ?? null,
      })
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  timer.mark("insert");

  if (holdRooms.length > 0) {
    try {
      await attachRoomsToNewBooking(
        data.id,
        input.check_in,
        input.check_out,
        holdRooms,
        tenantId,
        supabase,
      );
    } catch (e) {
      await rollbackFailedBookingRequest(data.id);
      throw e;
    }
  }

  const bookingId = data.id;
  const guestName = input.guest_name.trim();
  after(async () => {
    let linkedGuestId = guestId;
    let linkedAlert = guestAlert;
    let linkedConflict = mergeConflict;

    if (input.deferGuestLink) {
      try {
        const resolved = await resolveGuestForBooking({
          guest_name: input.guest_name,
          guest_last_name: input.guest_last_name,
          guest_first_name: input.guest_first_name,
          guest_email: input.guest_email,
          guest_phone: input.guest_phone,
        });
        linkedGuestId = resolved.guestId;
        linkedConflict = resolved.mergeConflict;
        linkedAlert = await resolveGuestAlertSnapshot({
          guestId: resolved.guestId,
          guestLastName: input.guest_last_name,
          guestFirstName: input.guest_first_name,
        });
        if (linkedGuestId || linkedAlert.level !== "normal") {
          await supabase
            .from("bookings")
            .update({
              guest_id: linkedGuestId,
              guest_alert_level: linkedAlert.level,
              guest_alert_note: linkedAlert.note,
            })
            .eq("tenant_id", tenantId)
            .eq("id", bookingId);
        }
      } catch {
        /* guest link is best-effort after the bar is already visible */
      }
    }

    await logAdminActivity({
      action: "booking.request_created",
      entityType: "booking",
      entityId: bookingId,
      summary: `Cerere nouă: ${guestName}`,
      metadata: {
        check_in: input.check_in,
        check_out: input.check_out,
        guest_email: input.guest_email.trim(),
        guest_id: linkedGuestId,
        guest_alert_level: linkedAlert.level,
        guest_alert_note: linkedAlert.note,
        ...(linkedConflict ? { guest_merge_conflict: true } : {}),
        ...(holdRooms.length > 0
          ? { room_ids: holdRooms, soft_hold: true }
          : {}),
      },
      actor: null,
    });

    if (linkedAlert.level !== "normal") {
      await logAdminActivity({
        action: "booking.flagged",
        entityType: "booking",
        entityId: bookingId,
        summary: `Cerere cu alertă client: ${guestName}`,
        metadata: {
          guest_alert_level: linkedAlert.level,
          guest_alert_note: linkedAlert.note,
        },
        actor: null,
      });
    }
  });

  timer.finish({ bookingId });
  return bookingId;
}


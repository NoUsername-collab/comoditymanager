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
import { assertRoomsAvailableForStay } from "./availability";

export async function assignBookingRoomHold(
  bookingId: string,
  roomIds: string[],
  options?: { skipAvailabilityCheck?: boolean }
): Promise<void> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.request_not_found");
  if (booking.status === "anulata") throw new Error("booking.request_cancelled");
  if (booking.status === "confirmata") {
    throw new Error("booking.already_confirmed");
  }

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
}): Promise<string> {
  assertValidGuestPhone(input.guest_phone);

  const holdRooms = input.room_ids?.length
    ? [...new Set(input.room_ids.filter(Boolean))]
    : [];

  if (holdRooms.length > 0) {
    await assertRoomsAvailableForStay(
      input.check_in,
      input.check_out,
      holdRooms
    );
  }

  const { tenantId, supabase } = await getTenantScope();

  const { guestId, mergeConflict } = await resolveGuestForBooking({
    guest_name: input.guest_name,
    guest_last_name: input.guest_last_name,
    guest_first_name: input.guest_first_name,
    guest_email: input.guest_email,
    guest_phone: input.guest_phone,
  });
  const guestAlert = await resolveGuestAlertSnapshot({
    guestId,
    guestLastName: input.guest_last_name,
    guestFirstName: input.guest_first_name,
  });

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

  if (holdRooms.length > 0) {
    try {
      await assignBookingRoomHold(data.id, holdRooms, {
        skipAvailabilityCheck: true,
      });
    } catch (e) {
      await rollbackFailedBookingRequest(data.id);
      throw e;
    }
  }

  await logAdminActivity({
    action: "booking.request_created",
    entityType: "booking",
    entityId: data.id,
    summary: `Cerere nouă: ${input.guest_name.trim()}`,
    metadata: {
      check_in: input.check_in,
      check_out: input.check_out,
      guest_email: input.guest_email.trim(),
      guest_id: guestId,
      guest_alert_level: guestAlert.level,
      guest_alert_note: guestAlert.note,
      ...(mergeConflict ? { guest_merge_conflict: true } : {}),
      ...(holdRooms.length > 0
        ? { room_ids: holdRooms, soft_hold: true }
        : {}),
    },
    actor: null,
  });

  if (guestAlert.level !== "normal") {
    await logAdminActivity({
      action: "booking.flagged",
      entityType: "booking",
      entityId: data.id,
      summary: `Cerere cu alertă client: ${input.guest_name.trim()}`,
      metadata: {
        guest_alert_level: guestAlert.level,
        guest_alert_note: guestAlert.note,
      },
      actor: null,
    });
  }

  return data.id;
}


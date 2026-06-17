import { unstable_cache } from "next/cache";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { shouldBlockCheckoutForUnpaid } from "@/domain/booking/checkout-readiness";
import { operativeCheckInDateFromAt } from "@/domain/booking/operative-checkin";
import { getCheckinByBookingId } from "@/services/checkin/queries";
import { getCheckinSettings } from "@/services/checkin/settings";
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
import { assertPostCheckoutEditAllowed } from "./post-checkout-guard";

import { getBookingById } from "./queries";

async function requireConfirmedBooking(bookingId: string) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error("booking.not_found");
  if (booking.status !== "confirmata") {
    throw new Error("booking.ops_only_for_confirmed");
  }
  return booking;
}

/** Check-in necesită telefon pe rezervare sau pe profilul client legat. */
async function ensureBookingPhoneForCheckIn(bookingId: string): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);

  if (isValidGuestPhone(booking.guest_phone)) return;

  if (booking.guest_id) {
    const { tenantId, supabase } = await getTenantScope();
    const { data: guest, error } = await supabase
      .from("guests")
      .select("phone, phone_normalized")
      .eq("tenant_id", tenantId)
      .eq("id", booking.guest_id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (guest && isValidGuestPhone(guest.phone)) {
      const phone = String(guest.phone).trim();
      const { error: upError } = await supabase
        .from("bookings")
        .update({
          guest_phone: phone,
        })
        .eq("tenant_id", tenantId)
        .eq("id", bookingId);
      if (upError) throw new Error(upError.message);
      return;
    }
  }

  throw new Error("booking.phone_required_for_checkin");
}

export async function updateBookingGuestPhone(
  bookingId: string,
  rawPhone: string
): Promise<void> {
  assertValidGuestPhone(rawPhone);
  const [booking, { tenantId, supabase }] = await Promise.all([
    getBookingById(bookingId),
    getTenantScope(),
  ]);
  if (!booking) throw new Error("booking.not_found");
  if (booking.actual_check_out_at) {
    await assertPostCheckoutEditAllowed(bookingId);
  }

  const phone = rawPhone.trim();
  const phoneNorm = normalizePhone(phone);

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ guest_phone: phone })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);
  if (bookingError) throw new Error(bookingError.message);

  if (booking.guest_id && phoneNorm) {
    const { error: guestError } = await supabase
      .from("guests")
      .update({
        phone,
        phone_normalized: phoneNorm,
      })
      .eq("tenant_id", tenantId)
      .eq("id", booking.guest_id);
    if (guestError) throw new Error(guestError.message);
  }

  await logAdminActivityFromSession({
    action: "guest.updated",
    entityType: "booking",
    entityId: bookingId,
    summary: `Telefon actualizat: ${booking.guest_name}`,
    metadata: { guest_id: booking.guest_id },
  });
}

export async function setBookingCheckIn(
  bookingId: string,
  at?: string | null
): Promise<void> {
  await ensureBookingPhoneForCheckIn(bookingId);
  const booking = await requireConfirmedBooking(bookingId);
  if (booking.actual_check_in_at) {
    throw new Error("booking.checkin_already_recorded");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.checkin_after_checkout_not_allowed");
  }

  const opDate = operativeCheckInDateFromAt(at);
  if (opDate !== booking.check_in) {
    throw new Error("booking.checkin_only_on_arrival_day");
  }

  const ts = parseOperationalTimestamp(at);
  const [user, { tenantId, supabase }] = await Promise.all([
    getAdminUser(),
    getTenantScope(),
  ]);
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: ts,
      actual_check_in_by: user?.id ?? null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      at: ts,
      planned_check_in: booking.check_in,
      planned_check_out: booking.check_out,
    },
  });
}

export async function setBookingCheckOut(
  bookingId: string,
  at?: string | null
): Promise<void> {
  const [booking, settings, checkin] = await Promise.all([
    requireConfirmedBooking(bookingId),
    getCheckinSettings(),
    getCheckinByBookingId(bookingId),
  ]);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_required_before_checkout");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.checkout_already_recorded");
  }

  if (
    shouldBlockCheckoutForUnpaid(
      settings,
      checkin?.payment_status ?? null
    )
  ) {
    throw new Error("booking.checkout_blocked_unpaid");
  }

  const ts = parseOperationalTimestamp(at);
  const checkInAt = new Date(booking.actual_check_in_at);
  const checkOutAt = new Date(ts);
  if (checkOutAt < checkInAt) {
    throw new Error("booking.checkout_before_checkin_not_allowed");
  }

  const [user, { tenantId, supabase }] = await Promise.all([
    getAdminUser(),
    getTenantScope(),
  ]);
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: ts,
      actual_check_out_by: user?.id ?? null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      at: ts,
      actual_check_in_at: booking.actual_check_in_at,
      planned_check_out: booking.check_out,
    },
  });
}

export async function editBookingCheckIn(
  bookingId: string,
  at?: string | null
): Promise<void> {
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_not_recorded");
  }

  if (booking.actual_check_out_at) {
    await assertPostCheckoutEditAllowed(bookingId);
  }

  const ts = parseOperationalTimestamp(at);
  if (booking.actual_check_out_at) {
    const checkOutAt = new Date(booking.actual_check_out_at);
    const editedCheckInAt = new Date(ts);
    if (editedCheckInAt > checkOutAt) {
      throw new Error("booking.checkout_before_checkin_not_allowed");
    }
  }

  const [user, { tenantId, supabase }] = await Promise.all([
    getAdminUser(),
    getTenantScope(),
  ]);
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: ts,
      actual_check_in_by: user?.id ?? null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in editat: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      previous_at: booking.actual_check_in_at,
      new_at: ts,
      actual_check_out_at: booking.actual_check_out_at,
    },
  });
}

export async function editBookingCheckOut(
  bookingId: string,
  at?: string | null
): Promise<void> {
  await assertPostCheckoutEditAllowed(bookingId);
  const booking = await requireConfirmedBooking(bookingId);
  if (!booking.actual_check_in_at) {
    throw new Error("booking.checkin_required_before_checkout");
  }
  if (!booking.actual_check_out_at) {
    throw new Error("booking.checkout_not_recorded");
  }

  const ts = parseOperationalTimestamp(at);
  const checkInAt = new Date(booking.actual_check_in_at);
  const editedCheckOutAt = new Date(ts);
  if (editedCheckOutAt < checkInAt) {
    throw new Error("booking.checkout_before_checkin_not_allowed");
  }

  const [user, { tenantId, supabase }] = await Promise.all([
    getAdminUser(),
    getTenantScope(),
  ]);
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: ts,
      actual_check_out_by: user?.id ?? null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.set",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out editat: ${booking.guest_name}`,
    undoable: true,
    metadata: {
      previous_at: booking.actual_check_out_at,
      new_at: ts,
      actual_check_in_at: booking.actual_check_in_at,
    },
  });
}

export async function undoBookingCheckIn(bookingId: string): Promise<void> {
  const [booking, { tenantId, supabase }] = await Promise.all([
    requireConfirmedBooking(bookingId),
    getTenantScope(),
  ]);
  const { getCheckinByBookingId } = await import("@/services/checkin/queries");
  const { deleteCheckinsForBooking } = await import("@/services/checkin/sync");
  const existingWizardCheckin = await getCheckinByBookingId(bookingId).catch(
    () => null,
  );

  if (!booking.actual_check_in_at && !existingWizardCheckin) {
    throw new Error("booking.checkin_not_recorded");
  }
  if (booking.actual_check_out_at) {
    throw new Error("booking.undo_checkout_first");
  }

  if (existingWizardCheckin) {
    await deleteCheckinsForBooking(bookingId);
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: null,
      actual_check_in_by: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkin.undo",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-in anulat: ${booking.guest_name}`,
    metadata: { previous_at: booking.actual_check_in_at },
  });
}

export async function undoBookingCheckOut(bookingId: string): Promise<void> {
  await assertPostCheckoutEditAllowed(bookingId);
  const [booking, { tenantId, supabase }] = await Promise.all([
    requireConfirmedBooking(bookingId),
    getTenantScope(),
  ]);
  if (!booking.actual_check_out_at) {
    throw new Error("booking.checkout_not_recorded");
  }
  const { error } = await supabase
    .from("bookings")
    .update({
      actual_check_out_at: null,
      actual_check_out_by: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "booking.checkout.undo",
    entityType: "booking",
    entityId: bookingId,
    summary: `Check-out anulat: ${booking.guest_name}`,
    metadata: { previous_at: booking.actual_check_out_at },
  });
}

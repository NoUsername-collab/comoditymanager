import { after } from "next/server";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { createServerTimer } from "@/lib/dev/server-timing";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { validateCheckin } from "@/domain/checkin/validate";
import type {
  CheckinFormData,
  CheckinSettings,
  BookingForCheckin,
  CheckinStatus,
} from "@/domain/checkin/types";
import { mapCheckinDocTypeForDb } from "@/domain/checkin/doc-type";
import {
  expandGuestsForPersistence,
  guestsToPersist,
} from "@/domain/checkin/guest-layout";
import type { CheckinIdentityScope } from "@/domain/checkin/types";
import { guestFullName } from "@/domain/checkin/identity-rules";
import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { encodeCheckinTransferRequired } from "@/domain/checkin/identity-result";
import { assertCheckinIdentityIntegrity } from "@/services/checkin/assert-checkin-identity";
import { reassignBookingHolder } from "@/services/bookings/reassign-holder";
import { getBookingById } from "@/services/bookings";
import {
  enrichCheckinGuestProfiles,
  resolveCheckinGuestIds,
} from "@/services/checkin/sync-guest-from-checkin";
import {
  normalizePaymentStatusForDb,
  optionalDateForDb,
  paymentAmountForStatus,
} from "@/domain/checkin/types";
import { bridgeCheckinPaymentToLedger } from "@/services/booking-payments";

/**
 * Create a check-in record for a booking.
 *
 * 1. Validates against owner rules
 * 2. Inserts checkin + checkin_guests
 * 3. Updates booking.actual_check_in_at
 * 4. Logs activity
 *
 * @returns The new checkin ID
 * @throws If validation blocks or DB errors
 */
export async function createCheckin(
  data: CheckinFormData,
  settings: CheckinSettings,
  booking: BookingForCheckin,
): Promise<string> {
  const timer = createServerTimer("createCheckinService");
  // ── Validate ──────────────────────────────────────────────
  const now = new Date();
  const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const validation = validateCheckin(data, settings, booking, currentHour, today);

  if (validation.status === "blocked") {
    throw new Error(
      `checkin.blocked: ${validation.blockers.join("; ")}`,
    );
  }

  let activeBooking = booking;

  if (data.transfer_booking_to_guest_id) {
    await reassignBookingHolder(
      data.booking_id,
      data.transfer_booking_to_guest_id,
    );
    const refreshed = await getBookingById(data.booking_id);
    if (!refreshed) throw new Error("booking.not_found");
    activeBooking = mapBookingToForCheckin(refreshed);
  }

  const identityResult = await assertCheckinIdentityIntegrity(
    data.guests,
    activeBooking,
  );
  if (identityResult.blockers.length > 0) {
    throw new Error(
      `checkin.blocked: ${identityResult.blockers.join("; ")}`,
    );
  }
  if (identityResult.transferOffer && !data.transfer_booking_to_guest_id) {
    throw new Error(
      encodeCheckinTransferRequired(identityResult.transferOffer),
    );
  }

  // Determine checkin status from validation result
  const checkinStatus: CheckinStatus =
    validation.status === "warning" ? "incomplete" : "complete";

  const { tenantId, supabase } = await getTenantScope();
  const checkedInAt = now.toISOString();
  const storedPaymentStatus = normalizePaymentStatusForDb(data.payment_status);
  const paymentAmountPaid = paymentAmountForStatus(
    data.payment_status,
    activeBooking.total_price,
    data.payment_amount_paid ?? 0,
  );

  // ── Insert checkin ────────────────────────────────────────
  const { data: checkinRow, error: checkinErr } = await supabase
    .from("checkins")
    .insert(
      withTenantId(tenantId, {
        booking_id: data.booking_id,
        type: data.type,
        status: checkinStatus,
        checked_in_at: checkedInAt,
        payment_status: storedPaymentStatus,
        payment_amount_paid: paymentAmountPaid,
        deposit_amount: data.deposit_amount ?? 0,
        key_handed: data.key_handed ?? false,
        keys_handed_rooms: data.keys_handed_rooms ?? [],
        flags: validation.flags,
        notes: data.notes ?? null,
      }),
    )
    .select("id")
    .single();

  if (checkinErr) throw new Error(checkinErr.message);
  const checkinId = checkinRow.id;
  timer.mark("insertCheckin");

  const { checkinPatch } = await bridgeCheckinPaymentToLedger(
    activeBooking.id,
    activeBooking.total_price,
    {
      payment_status: data.payment_status,
      payment_amount_paid: data.payment_amount_paid ?? 0,
    },
  );
  if (Object.keys(checkinPatch).length > 0) {
    const { error: paymentPatchErr } = await supabase
      .from("checkins")
      .update(checkinPatch)
      .eq("tenant_id", tenantId)
      .eq("id", checkinId);
    if (paymentPatchErr) throw new Error(paymentPatchErr.message);
  }

  // ── Sync identity → profil client (`guests`) ───────────────
  const scope: CheckinIdentityScope = data.identity_scope ?? "per_room";
  const receptionRooms = data.reception_rooms ?? [];
  const expandedGuests = expandGuestsForPersistence(
    data.guests,
    scope,
    receptionRooms,
  );
  const identityGuests = expandedGuests.filter((g) => !g.keys_only);
  const resolvedIdentity = await resolveCheckinGuestIds(
    identityGuests,
    activeBooking,
  );
  timer.mark("resolveGuestIds");
  let syncIdx = 0;
  const mergedGuests = expandedGuests.map((g) => {
    if (g.keys_only) return g;
    return resolvedIdentity[syncIdx++] ?? g;
  });
  const guestsForDb = guestsToPersist(mergedGuests);
  if (guestsForDb.length > 0) {
    const guestRows = guestsForDb.map((g) =>
      withTenantId(tenantId, {
        checkin_id: checkinId,
        guest_id: g.guest_id ?? null,
        full_name: guestFullName(g) || g.full_name,
        last_name: g.last_name ?? null,
        first_name: g.first_name ?? null,
        phone: g.phone ?? null,
        national_id: g.national_id ?? null,
        document_type: mapCheckinDocTypeForDb(g.document_type),
        document_series: g.document_series ?? null,
        document_number: g.document_number ?? null,
        nationality: g.nationality ?? null,
        birth_date: optionalDateForDb(g.birth_date),
        room_label: g.room_label ?? null,
        is_representative: g.is_representative ?? false,
        checked_in_at: checkedInAt,
      }),
    );

    const { error: guestErr } = await supabase
      .from("checkin_guests")
      .insert(guestRows);

    if (guestErr) throw new Error(guestErr.message);
  }

  // ── Update booking.actual_check_in_at (prima sosire) ────────
  if (!activeBooking.actual_check_in_at) {
    const { error: bookingErr } = await supabase
      .from("bookings")
      .update({
        actual_check_in_at: checkedInAt,
      })
      .eq("tenant_id", tenantId)
      .eq("id", data.booking_id);

    if (bookingErr) throw new Error(bookingErr.message);
  }

  // ── Log activity ──────────────────────────────────────────
  const flagSummary =
    validation.flags.length > 0
      ? ` [${validation.flags.join(", ")}]`
      : "";

  after(async () => {
    await enrichCheckinGuestProfiles(resolvedIdentity, activeBooking);
    await logAdminActivityFromSession({
      action: "checkin.created",
      entityType: "checkin",
      entityId: checkinId,
      summary: `Check-in: ${booking.guest_name}${flagSummary}`,
      undoable: true,
      metadata: {
        booking_id: data.booking_id,
        type: data.type,
        status: checkinStatus,
        flags: validation.flags,
        payment_status: normalizePaymentStatusForDb(data.payment_status),
        payment_channel:
          data.payment_status === "online" ? "online_mock" : "manual",
        guest_count: guestsForDb.length,
      },
    });
  });

  timer.finish({ checkinId, bookingId: data.booking_id });
  return checkinId;
}

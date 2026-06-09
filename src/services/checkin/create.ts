import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { validateCheckin } from "@/domain/checkin/validate";
import type {
  CheckinFormData,
  CheckinSettings,
  BookingForCheckin,
  CheckinStatus,
} from "@/domain/checkin/types";
import { guestsToPersist } from "@/domain/checkin/guest-layout";
import { guestFullName } from "@/domain/checkin/identity-rules";
import {
  normalizePaymentStatusForDb,
  optionalDateForDb,
} from "@/domain/checkin/types";

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

  // Determine checkin status from validation result
  const checkinStatus: CheckinStatus =
    validation.status === "warning" ? "incomplete" : "complete";

  const { tenantId, supabase } = await getTenantScope();
  const checkedInAt = now.toISOString();

  // ── Insert checkin ────────────────────────────────────────
  const { data: checkinRow, error: checkinErr } = await supabase
    .from("checkins")
    .insert(
      withTenantId(tenantId, {
        booking_id: data.booking_id,
        type: data.type,
        status: checkinStatus,
        checked_in_at: checkedInAt,
        payment_status: normalizePaymentStatusForDb(data.payment_status),
        payment_amount_paid: data.payment_amount_paid ?? 0,
        deposit_amount: data.deposit_amount ?? 0,
        key_handed: data.key_handed ?? false,
        flags: validation.flags,
        notes: data.notes ?? null,
      }),
    )
    .select("id")
    .single();

  if (checkinErr) throw new Error(checkinErr.message);
  const checkinId = checkinRow.id;

  // ── Insert checkin guests ─────────────────────────────────
  const guestsForDb = guestsToPersist(data.guests);
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
        document_type: g.document_type ?? null,
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

  // ── Update booking.actual_check_in_at ─────────────────────
  const { error: bookingErr } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: checkedInAt,
    })
    .eq("tenant_id", tenantId)
    .eq("id", data.booking_id);

  if (bookingErr) throw new Error(bookingErr.message);

  // ── Log activity ──────────────────────────────────────────
  const flagSummary =
    validation.flags.length > 0
      ? ` [${validation.flags.join(", ")}]`
      : "";

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

  return checkinId;
}

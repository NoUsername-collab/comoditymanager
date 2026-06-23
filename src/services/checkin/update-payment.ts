import { getTenantScope } from "@/lib/tenant/scope";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { validateCheckin } from "@/domain/checkin/validate";
import type {
  CheckinFormData,
  CheckinSettings,
  BookingForCheckin,
  PaymentStatus,
} from "@/domain/checkin/types";
import {
  normalizePaymentStatusForDb,
  paymentAmountForStatus,
} from "@/domain/checkin/types";
import { mapPersistedCheckinGuestsToInput } from "@/domain/checkin/map-persisted-guests";
import { getCheckinGuests } from "@/services/checkin/queries";
import { applyBookingPaymentTarget } from "@/services/booking-payments";

/** Actualizează doar plata pe un check-in existent. */
export async function updateCheckinPayment(
  checkinId: string,
  input: {
    payment_status: PaymentStatus;
    payment_amount_paid: number;
    deposit_amount: number;
  },
  settings: CheckinSettings,
  booking: BookingForCheckin,
): Promise<void> {
  const guestRows = await getCheckinGuests(checkinId);
  const guests = mapPersistedCheckinGuestsToInput(guestRows);
  if (guests.length === 0) {
    throw new Error("checkin.no_guests");
  }

  const data: CheckinFormData = {
    type: "reservation",
    booking_id: booking.id,
    guests,
    payment_status: input.payment_status,
    payment_amount_paid: input.payment_amount_paid,
    deposit_amount: input.deposit_amount,
    key_handed: false,
    keys_handed_rooms: [],
  };

  const now = new Date();
  const currentHour = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const validation = validateCheckin(data, settings, booking, currentHour, today);

  if (validation.status === "blocked") {
    throw new Error(`checkin.blocked: ${validation.blockers.join("; ")}`);
  }

  const { tenantId, supabase } = await getTenantScope();
  const storedStatus = normalizePaymentStatusForDb(input.payment_status);
  const amountPaid = paymentAmountForStatus(
    input.payment_status,
    booking.total_price,
    input.payment_amount_paid,
  );

  const ledgerResult = await applyBookingPaymentTarget(booking.id, amountPaid, {
    method: "cash",
  });

  const checkinPatch: Record<string, unknown> = {
    deposit_amount: input.deposit_amount ?? 0,
    flags: validation.flags,
    status: validation.status === "warning" ? "incomplete" : "complete",
  };

  if (!ledgerResult.ok) {
    if (ledgerResult.error === "payment.migration_required") {
      checkinPatch.payment_status = storedStatus;
      checkinPatch.payment_amount_paid = amountPaid;
    } else {
      throw new Error(ledgerResult.error);
    }
  }

  const { error } = await supabase
    .from("checkins")
    .update(checkinPatch)
    .eq("tenant_id", tenantId)
    .eq("id", checkinId)
    .eq("booking_id", booking.id);

  if (error) throw new Error(error.message);

  await logAdminActivityFromSession({
    action: "checkin.updated",
    entityType: "checkin",
    entityId: checkinId,
    summary: `Plată check-in: ${booking.guest_name} — ${storedStatus}`,
    metadata: {
      booking_id: booking.id,
      payment_status: storedStatus,
      payment_amount_paid: amountPaid,
    },
  });
}

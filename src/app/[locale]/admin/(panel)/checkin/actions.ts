"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  revalidateBookingDetailSurfaces,
} from "@/lib/cache/revalidate-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { createCheckin } from "@/services/checkin/create";
import { getCheckinSettings, updateCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "@/services/bookings";
import type {
  CheckinFormData,
  CheckinGuestInput,
  PaymentStatus,
  CheckinType,
  BookingForCheckin,
} from "@/domain/checkin/types";

export type CreateCheckinResult = {
  ok: boolean;
  error?: string;
  checkinId?: string;
};

/**
 * Server action: create a check-in from the stepper form.
 */
export async function createCheckinAction(
  formData: FormData,
): Promise<CreateCheckinResult> {
  await requireAdmin();

  try {
    const bookingId = String(formData.get("booking_id") ?? "");
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const type = (formData.get("type") as CheckinType) ?? "reservation";
    const paymentStatus =
      (formData.get("payment_status") as PaymentStatus) ?? "unpaid";
    const paymentAmountPaid = Number(formData.get("payment_amount_paid")) || 0;
    const depositAmount = Number(formData.get("deposit_amount")) || 0;
    const keyHanded = formData.get("key_handed") === "true";
    const notes = String(formData.get("notes") ?? "").trim() || undefined;

    // Parse guests from JSON
    const guestsJson = String(formData.get("guests") ?? "[]");
    let guests: CheckinGuestInput[];
    try {
      guests = JSON.parse(guestsJson);
    } catch {
      return { ok: false, error: "Invalid guests data" };
    }

    if (!Array.isArray(guests) || guests.length === 0) {
      return { ok: false, error: "At least one guest required" };
    }

    // Load booking data
    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const bookingForCheckin: BookingForCheckin = {
      id: booking.id,
      status: booking.status,
      total_price: booking.total_price ?? 0,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guest_name: booking.guest_name,
      guest_phone: booking.guest_phone ?? null,
      guest_email: booking.guest_email ?? null,
      num_adults: booking.num_adults,
      num_children: booking.num_children ?? 0,
    };

    // Load settings
    const settings = await getCheckinSettings();

    // Build form data
    const checkinData: CheckinFormData = {
      type,
      booking_id: bookingId,
      guests,
      payment_status: paymentStatus,
      payment_amount_paid: paymentAmountPaid,
      deposit_amount: depositAmount,
      key_handed: keyHanded,
      notes,
    };

    const checkinId = await createCheckin(checkinData, settings, bookingForCheckin);

    // Revalidate
    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateTag(CACHE_TAGS.checkins, "max");
    revalidateBookingDetailSurfaces(bookingId, tenantId);

    return { ok: true, checkinId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

/**
 * Server action: update check-in settings (owner panel).
 */
export async function updateCheckinSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  try {
    const input: Record<string, unknown> = {};

    const fields = [
      "checkin_doc_rule",
      "checkin_phone_rule",
      "checkin_payment_rule",
      "group_checkin_mode",
    ];
    for (const f of fields) {
      const v = formData.get(f);
      if (v != null) input[f] = String(v);
    }

    const intFields = ["checkin_min_payment_pct"];
    for (const f of intFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const numFields = [
      "checkin_deposit_amount",
      "late_checkout_fee",
      "early_checkin_fee",
    ];
    for (const f of numFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const boolFields = [
      "checkin_deposit",
      "walkin_allowed",
      "late_checkout_allowed",
      "early_checkin_allowed",
    ];
    for (const f of boolFields) {
      const v = formData.get(f);
      if (v != null) input[f] = v === "true";
    }

    const timeFields = ["checkin_time_from", "checkout_time_until"];
    for (const f of timeFields) {
      const v = formData.get(f);
      if (v != null) input[f] = String(v) || null;
    }

    await updateCheckinSettings(input);

    // Log settings change
    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Check-in settings updated",
      metadata: { section: "checkin", ...input },
    });

    // Revalidate settings cache
    const tenantId = await resolveTenantIdForData();
    revalidateTag(
      tenantTag(tenantId, CACHE_TAGS.pensionSettings),
      "max",
    );
    revalidateTag(CACHE_TAGS.pensionSettings, "max");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: msg };
  }
}

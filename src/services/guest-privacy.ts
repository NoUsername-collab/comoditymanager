import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";
import { GUEST_RETENTION_DEFAULT_MONTHS, isGuestRetentionMonths } from "@/domain/guest/privacy";

/*
 * A guest's personal data under GDPR: what the property holds about one guest
 * (export, art. 15/20), erasing it on request (art. 17), and how long identity
 * documents are kept after the last stay (art. 5(1)(e)). The erasure and the
 * daily purge run in the database (migration 122), each in one transaction.
 */

export type EraseGuestError = "guest.not_found" | "guest.has_open_stay";

export async function eraseGuestPersonalData(
  guestId: string,
): Promise<{ ok: true } | { ok: false; error: EraseGuestError }> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase.rpc("erase_guest_personal_data", {
    p_tenant_id: tenantId,
    p_guest_id: guestId,
  });
  if (!error) return { ok: true };
  if (error.message.includes("guest.has_open_stay"))
    return { ok: false, error: "guest.has_open_stay" };
  if (error.message.includes("guest.not_found")) return { ok: false, error: "guest.not_found" };
  throw new Error(error.message);
}

/** Everything the property holds about one guest, as one JSON document. */
export async function exportGuestPersonalData(
  guestId: string,
): Promise<Record<string, unknown> | null> {
  const { tenantId, supabase } = await getTenantScope();
  const { data: guest, error } = await supabase
    .from("guests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", guestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!guest) return null;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name, guest_email, guest_phone, num_adults, num_children, children_ages, notes, total_price, source, created_at, confirmed_at, actual_check_in_at, actual_check_out_at",
    )
    .eq("tenant_id", tenantId)
    .eq("guest_id", guestId)
    .order("check_in", { ascending: true });
  if (bookingsError) throw new Error(bookingsError.message);
  const bookingIds = (bookings ?? []).map((b) => b.id as string);
  const byBookings = <T>(rows: T[] | null) => rows ?? [];
  const none = Promise.resolve({ data: [] as Record<string, unknown>[], error: null });

  const [
    profile,
    reviews,
    checkinGuests,
    precheckins,
    feedback,
    requests,
    greenStay,
    loyalty,
    invoices,
    payments,
  ] = await Promise.all([
    supabase
      .from("guest_profiles")
      .select(
        "flag_level, blacklist_reason, manual_note, completed_stays, total_nights, last_stay_check_out, created_at",
      )
      .eq("tenant_id", tenantId)
      .eq("guest_id", guestId)
      .maybeSingle(),
    supabase
      .from("guest_stay_reviews")
      .select("booking_id, stars, polarity, note, reviewed_at")
      .eq("tenant_id", tenantId)
      .eq("guest_id", guestId),
    supabase
      .from("checkin_guests")
      .select(
        "full_name, last_name, first_name, phone, document_type, document_series, document_number, national_id, nationality, birth_date, room_label, checked_in_at",
      )
      .eq("tenant_id", tenantId)
      .eq("guest_id", guestId),
    bookingIds.length
      ? supabase
          .from("guest_precheckin_submissions")
          .select(
            "booking_id, guest_last_name, guest_first_name, guest_phone, guest_email, document_type, document_number, national_id, birth_date, nationality, notes, submitted_at",
          )
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
    bookingIds.length
      ? supabase
          .from("guest_feedback")
          .select("booking_id, stars, comment, submitted_at")
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
    bookingIds.length
      ? supabase
          .from("guest_reception_requests")
          .select("booking_id, message, status, created_at")
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
    bookingIds.length
      ? supabase
          .from("guest_green_stay_requests")
          .select("booking_id, skip_date, note, status, created_at")
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
    supabase
      .from("guest_loyalty_refs")
      .select("reference_code, issued_at, revoked_at")
      .eq("tenant_id", tenantId)
      .eq("guest_id", guestId),
    bookingIds.length
      ? supabase
          .from("booking_invoices")
          .select(
            "booking_id, display_number, invoice_kind, issued_at, buyer_name, buyer_email, buyer_phone, check_in, check_out, total, currency, status",
          )
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
    bookingIds.length
      ? supabase
          .from("booking_payments")
          .select("booking_id, amount, kind, method, payer_name, payer_tax_id, paid_at")
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
      : none,
  ]);
  for (const result of [
    profile,
    reviews,
    checkinGuests,
    precheckins,
    feedback,
    requests,
    greenStay,
    loyalty,
    invoices,
    payments,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const { tenant_id: _tenantId, ...guestFields } = guest as Record<string, unknown>;
  return {
    exportedAt: new Date().toISOString(),
    guest: guestFields,
    profile: profile.data ?? null,
    stays: byBookings(bookings),
    stayReviews: byBookings(reviews.data),
    checkInRecords: byBookings(checkinGuests.data),
    onlineCheckIns: byBookings(precheckins.data),
    feedback: byBookings(feedback.data),
    receptionRequests: byBookings(requests.data),
    greenStayRequests: byBookings(greenStay.data),
    loyaltyReferences: byBookings(loyalty.data),
    invoices: byBookings(invoices.data),
    payments: byBookings(payments.data),
  };
}

export async function getGuestRetentionMonths(): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("pension_settings")
    .select("guest_identity_retention_months")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const months = Number(data?.guest_identity_retention_months);
  return isGuestRetentionMonths(months) ? months : GUEST_RETENTION_DEFAULT_MONTHS;
}

export async function updateGuestRetentionMonths(months: number): Promise<void> {
  if (!isGuestRetentionMonths(months)) throw new Error("guest.retention_invalid");
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("pension_settings")
    .update({ guest_identity_retention_months: months })
    .eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** The daily purge across properties; returns how many guest files were cleared. */
export async function purgeExpiredGuestIdentity(): Promise<number> {
  // cross-tenant cron batch — the database function applies each property's own period
  const { data, error } = await createPublicAdminClient().rpc("purge_expired_guest_identity");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

import { getTenantScope } from "@/lib/tenant/scope";
import type { CheckinRow } from "./types";

/** Aliniază bookings.actual_check_in_at cu înregistrarea din checkins (date orfane). */
export async function syncBookingOperativeCheckInFromRecord(
  bookingId: string,
  checkin?: Pick<CheckinRow, "checked_in_at" | "checked_in_by"> | null,
): Promise<boolean> {
  const { tenantId, supabase } = await getTenantScope();

  let row = checkin;
  if (!row) {
    const { data, error } = await supabase
      .from("checkins")
      .select("checked_in_at, checked_in_by")
      .eq("tenant_id", tenantId)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    row = data;
  }

  if (!row?.checked_in_at) return false;

  const { error: upErr } = await supabase
    .from("bookings")
    .update({
      actual_check_in_at: row.checked_in_at,
      actual_check_in_by: row.checked_in_by ?? null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .is("actual_check_in_at", null);

  if (upErr) throw new Error(upErr.message);
  return true;
}

/** Șterge înregistrările wizard check-in pentru o rezervare. */
export async function deleteCheckinsForBooking(bookingId: string): Promise<void> {
  const { tenantId, supabase } = await getTenantScope();
  const { error } = await supabase
    .from("checkins")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId);

  if (error) throw new Error(error.message);
}

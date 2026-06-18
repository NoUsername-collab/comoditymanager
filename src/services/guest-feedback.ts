"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenantIdForData } from "@/lib/tenant/guards";

export type GuestFeedbackRow = {
  id: string;
  booking_id: string;
  stars: number;
  comment: string;
  submitted_at: string;
};

export async function getGuestFeedbackByBookingId(
  bookingId: string,
): Promise<GuestFeedbackRow | null> {
  const tenantId = await requireTenantIdForData();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("guest_feedback")
    .select("id, booking_id, stars, comment, submitted_at")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  return data ?? null;
}

export async function getGuestFeedbackByBookingIds(
  bookingIds: string[],
): Promise<Map<string, GuestFeedbackRow>> {
  if (bookingIds.length === 0) return new Map();
  const tenantId = await requireTenantIdForData();
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("guest_feedback")
    .select("id, booking_id, stars, comment, submitted_at")
    .eq("tenant_id", tenantId)
    .in("booking_id", bookingIds);
  const map = new Map<string, GuestFeedbackRow>();
  for (const row of data ?? []) {
    map.set(row.booking_id, row);
  }
  return map;
}

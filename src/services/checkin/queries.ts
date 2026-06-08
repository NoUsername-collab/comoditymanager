import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { CheckinRow, CheckinGuestRow } from "./types";
import { CHECKIN_ROW_SELECT, CHECKIN_GUEST_ROW_SELECT } from "./types";

// ── Single checkin for a booking ────────────────────────────

async function getCheckinByBookingIdUncached(
  tenantId: string,
  bookingId: string,
): Promise<CheckinRow | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("checkins")
    .select(CHECKIN_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CheckinRow | null;
}

export async function getCheckinByBookingId(
  bookingId: string,
): Promise<CheckinRow | null> {
  const tenantId = await resolveTenantIdForData();
  const cached = unstable_cache(
    () => getCheckinByBookingIdUncached(tenantId, bookingId),
    ["checkin-by-booking", tenantId, bookingId],
    {
      tags: [CACHE_TAGS.checkins, tenantTag(tenantId, CACHE_TAGS.checkins)],
      revalidate: 120,
    },
  );
  return cached();
}

// ── Guests for a checkin ────────────────────────────────────

async function getCheckinGuestsUncached(
  tenantId: string,
  checkinId: string,
): Promise<CheckinGuestRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("checkin_guests")
    .select(CHECKIN_GUEST_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .eq("checkin_id", checkinId)
    .order("is_representative", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CheckinGuestRow[];
}

export async function getCheckinGuests(
  checkinId: string,
): Promise<CheckinGuestRow[]> {
  const tenantId = await resolveTenantIdForData();
  const cached = unstable_cache(
    () => getCheckinGuestsUncached(tenantId, checkinId),
    ["checkin-guests", tenantId, checkinId],
    {
      tags: [CACHE_TAGS.checkins, tenantTag(tenantId, CACHE_TAGS.checkins)],
      revalidate: 120,
    },
  );
  return cached();
}

// ── Active checkins with flags (for dashboard/Gantt) ────────

export async function getActiveCheckinsWithFlags(): Promise<
  (CheckinRow & { booking_guest_name?: string })[]
> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("checkins")
    .select(`${CHECKIN_ROW_SELECT}, bookings(guest_name)`)
    .eq("tenant_id", tenantId)
    .not("flags", "eq", "{}")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const bookings = row.bookings as { guest_name?: string } | null;
    return {
      ...(row as unknown as CheckinRow),
      booking_guest_name: bookings?.guest_name ?? undefined,
    };
  });
}

// ── Today's checkins count (dashboard) ──────────────────────

export async function getTodayCheckinCount(): Promise<number> {
  const { tenantId, supabase } = await getTenantScope();
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("checked_in_at", `${today}T00:00:00`)
    .lt("checked_in_at", `${today}T23:59:59`);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

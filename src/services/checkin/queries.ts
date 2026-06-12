import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import type { CheckinRow, CheckinGuestRow } from "./types";
import {
  CHECKIN_ROW_SELECT,
  CHECKIN_GUEST_ROW_SELECT,
  CHECKIN_GUEST_ROW_SELECT_MINIMAL,
} from "./types";

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

const getCachedCheckinByBooking = (tenantId: string, bookingId: string) =>
  unstable_cache(
    () => getCheckinByBookingIdUncached(tenantId, bookingId),
    ["checkin-by-booking", tenantId, bookingId],
    {
      tags: [CACHE_TAGS.checkins, tenantTag(tenantId, CACHE_TAGS.checkins)],
      revalidate: 120,
    }
  );

const loadCheckinByBooking = cache(async (bookingId: string) => {
  const tenantId = await resolveTenantIdForData();
  return getCachedCheckinByBooking(tenantId, bookingId)();
});

export async function getCheckinByBookingId(
  bookingId: string,
): Promise<CheckinRow | null> {
  return loadCheckinByBooking(bookingId);
}

// ── Guests for a checkin ────────────────────────────────────

async function getCheckinGuestsUncached(
  tenantId: string,
  checkinId: string,
): Promise<CheckinGuestRow[]> {
  const supabase = createPublicAdminClient();

  const queryGuests = (select: string) =>
    supabase
      .from("checkin_guests")
      .select(select)
      .eq("tenant_id", tenantId)
      .eq("checkin_id", checkinId)
      .order("is_representative", { ascending: false });

  let { data, error } = await queryGuests(CHECKIN_GUEST_ROW_SELECT);

  if (error && isCheckinMigrationMissing(error.message)) {
    ({ data, error } = await queryGuests(CHECKIN_GUEST_ROW_SELECT_MINIMAL));
  }

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CheckinGuestRow[];
}

const getCachedCheckinGuests = (tenantId: string, checkinId: string) =>
  unstable_cache(
    () => getCheckinGuestsUncached(tenantId, checkinId),
    ["checkin-guests", tenantId, checkinId],
    {
      tags: [CACHE_TAGS.checkins, tenantTag(tenantId, CACHE_TAGS.checkins)],
      revalidate: 120,
    }
  );

const loadCheckinGuests = cache(async (checkinId: string) => {
  const tenantId = await resolveTenantIdForData();
  return getCachedCheckinGuests(tenantId, checkinId)();
});

export async function getCheckinGuests(
  checkinId: string,
): Promise<CheckinGuestRow[]> {
  return loadCheckinGuests(checkinId);
}

/** Camere distincte deja recepționate per rezervare (toate sesiunile de check-in). */
export async function getCheckedInRoomsByBookingIds(
  bookingIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!bookingIds.length) return result;

  const { tenantId, supabase } = await getTenantScope();

  const { data: checkins, error: checkinErr } = await supabase
    .from("checkins")
    .select("id, booking_id")
    .eq("tenant_id", tenantId)
    .in("booking_id", bookingIds);

  if (checkinErr) {
    if (isCheckinMigrationMissing(checkinErr.message)) return result;
    throw new Error(checkinErr.message);
  }
  if (!checkins?.length) return result;

  const checkinToBooking = new Map<string, string>();
  for (const row of checkins) {
    checkinToBooking.set(row.id as string, row.booking_id as string);
  }

  const checkinIds = [...checkinToBooking.keys()];
  let guests: { checkin_id: string; room_label: string | null }[] | null = null;
  let guestErr: { message: string } | null = null;

  ({ data: guests, error: guestErr } = await supabase
    .from("checkin_guests")
    .select("checkin_id, room_label")
    .eq("tenant_id", tenantId)
    .in("checkin_id", checkinIds));

  if (guestErr?.message && isCheckinMigrationMissing(guestErr.message)) {
    return result;
  }
  if (guestErr) throw new Error(guestErr.message);

  for (const guest of guests ?? []) {
    const bookingId = checkinToBooking.get(guest.checkin_id as string);
    const label = (guest.room_label as string | null)?.trim();
    if (!bookingId || !label) continue;
    const list = result.get(bookingId) ?? [];
    if (!list.some((r) => r.toLowerCase() === label.toLowerCase())) {
      list.push(label);
      result.set(bookingId, list);
    }
  }

  return result;
}

/** Camere cu cheie înmânată per rezervare (uniune din toate sesiunile). */
export async function getKeysHandedRoomsByBookingIds(
  bookingIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!bookingIds.length) return result;

  const { tenantId, supabase } = await getTenantScope();

  const { data, error } = await supabase
    .from("checkins")
    .select("booking_id, keys_handed_rooms")
    .eq("tenant_id", tenantId)
    .in("booking_id", bookingIds);

  if (error) {
    if (isCheckinMigrationMissing(error.message)) return result;
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const bookingId = row.booking_id as string;
    const rooms = (row.keys_handed_rooms as string[] | null) ?? [];
    if (!rooms.length) continue;
    const list = result.get(bookingId) ?? [];
    for (const room of rooms) {
      const label = room?.trim();
      if (!label) continue;
      if (!list.some((r) => r.toLowerCase() === label.toLowerCase())) {
        list.push(label);
      }
    }
    if (list.length) result.set(bookingId, list);
  }

  return result;
}

export async function getCheckedInRoomsForBooking(
  bookingId: string,
): Promise<string[]> {
  const map = await getCheckedInRoomsByBookingIds([bookingId]);
  return map.get(bookingId) ?? [];
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

/** In-house stays with check-in recorded but payment still unpaid/partial. */
async function countUnpaidInHouseCheckinsUncached(
  tenantId: string,
): Promise<number> {
  const supabase = createPublicAdminClient();

  const { data: inHouse, error: bookingsError } = await supabase
    .from("bookings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata")
    .not("actual_check_in_at", "is", null)
    .is("actual_check_out_at", null);

  if (bookingsError) throw new Error(bookingsError.message);
  if (!inHouse?.length) return 0;

  const bookingIds = inHouse.map((row) => row.id as string);
  const { count, error } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("booking_id", bookingIds)
    .in("payment_status", ["unpaid", "partial"]);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const getCachedUnpaidInHouseCount = (tenantId: string) =>
  unstable_cache(
    () => countUnpaidInHouseCheckinsUncached(tenantId),
    ["checkin-unpaid-in-house", tenantId],
    {
      tags: [CACHE_TAGS.checkins, tenantTag(tenantId, CACHE_TAGS.checkins)],
      revalidate: 60,
    },
  );

export async function countUnpaidInHouseCheckins(): Promise<number> {
  try {
    const tenantId = await resolveTenantIdForData();
    return getCachedUnpaidInHouseCount(tenantId)();
  } catch {
    return 0;
  }
}

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

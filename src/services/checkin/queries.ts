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

import type { StoredPaymentStatus } from "@/domain/checkin/types";

function mergeRoomLabel(
  map: Map<string, string[]>,
  bookingId: string,
  label: string,
): void {
  const list = map.get(bookingId) ?? [];
  if (!list.some((r) => r.toLowerCase() === label.toLowerCase())) {
    list.push(label);
    map.set(bookingId, list);
  }
}

export type CheckinBookingEnrichment = {
  latestByBooking: Map<string, CheckinLiteRow>;
  checkedRoomsByBooking: Map<string, string[]>;
  keysHandedByBooking: Map<string, string[]>;
  roomIdVerifiedByBooking: Map<string, string[]>;
};

type CheckinLiteRow = {
  booking_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  payment_status: StoredPaymentStatus | null;
};

const EMPTY_ENRICHMENT: CheckinBookingEnrichment = {
  latestByBooking: new Map(),
  checkedRoomsByBooking: new Map(),
  keysHandedByBooking: new Map(),
  roomIdVerifiedByBooking: new Map(),
};

/** Un singur round-trip checkins + checkin_guests pentru N rezervări (Gantt refresh). */
export async function loadCheckinEnrichmentByBookingIds(
  bookingIds: string[],
): Promise<CheckinBookingEnrichment> {
  if (!bookingIds.length) return EMPTY_ENRICHMENT;

  const { tenantId, supabase } = await getTenantScope();

  const { data: checkins, error: checkinErr } = await supabase
    .from("checkins")
    .select(
      "id, booking_id, checked_in_at, checked_in_by, payment_status, keys_handed_rooms, created_at",
    )
    .eq("tenant_id", tenantId)
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  if (checkinErr) {
    if (isCheckinMigrationMissing(checkinErr.message)) return EMPTY_ENRICHMENT;
    throw new Error(checkinErr.message);
  }
  if (!checkins?.length) return EMPTY_ENRICHMENT;

  const latestByBooking = new Map<string, CheckinLiteRow>();
  const keysHandedByBooking = new Map<string, string[]>();
  const checkinToBooking = new Map<string, string>();
  const checkinIds: string[] = [];

  for (const row of checkins) {
    const bookingId = row.booking_id as string;
    const checkinId = row.id as string;
    checkinToBooking.set(checkinId, bookingId);
    checkinIds.push(checkinId);

    if (!latestByBooking.has(bookingId)) {
      latestByBooking.set(bookingId, {
        booking_id: bookingId,
        checked_in_at: row.checked_in_at as string,
        checked_in_by: (row.checked_in_by as string | null) ?? null,
        payment_status:
          (row.payment_status as StoredPaymentStatus | null) ?? null,
      });
    }

    for (const room of (row.keys_handed_rooms as string[] | null) ?? []) {
      const label = room?.trim();
      if (label) mergeRoomLabel(keysHandedByBooking, bookingId, label);
    }
  }

  const checkedRoomsByBooking = new Map<string, string[]>();
  const roomIdVerifiedByBooking = new Map<string, string[]>();

  const { data: guests, error: guestErr } = await supabase
    .from("checkin_guests")
    .select(
      "checkin_id, room_label, national_id, document_number, document_series",
    )
    .eq("tenant_id", tenantId)
    .in("checkin_id", checkinIds);

  if (guestErr) {
    if (isCheckinMigrationMissing(guestErr.message)) {
      return {
        latestByBooking,
        checkedRoomsByBooking,
        keysHandedByBooking,
        roomIdVerifiedByBooking,
      };
    }
    throw new Error(guestErr.message);
  }

  for (const guest of guests ?? []) {
    const bookingId = checkinToBooking.get(guest.checkin_id as string);
    const label = (guest.room_label as string | null)?.trim();
    if (!bookingId || !label) continue;

    mergeRoomLabel(checkedRoomsByBooking, bookingId, label);

    const hasId = Boolean(
      (guest.national_id as string | null)?.trim() ||
        (guest.document_number as string | null)?.trim() ||
        (guest.document_series as string | null)?.trim(),
    );
    if (hasId) mergeRoomLabel(roomIdVerifiedByBooking, bookingId, label);
  }

  return {
    latestByBooking,
    checkedRoomsByBooking,
    keysHandedByBooking,
    roomIdVerifiedByBooking,
  };
}

/** Camere distincte deja recepționate per rezervare (toate sesiunile de check-in). */
export async function getCheckedInRoomsByBookingIds(
  bookingIds: string[],
): Promise<Map<string, string[]>> {
  const batch = await loadCheckinEnrichmentByBookingIds(bookingIds);
  return batch.checkedRoomsByBooking;
}

/** Camere cu cheie înmânată per rezervare (uniune din toate sesiunile). */
export async function getKeysHandedRoomsByBookingIds(
  bookingIds: string[],
): Promise<Map<string, string[]>> {
  const batch = await loadCheckinEnrichmentByBookingIds(bookingIds);
  return batch.keysHandedByBooking;
}

/** Camere cu cel puțin un oaspete identificat (CNP valid sau document) per rezervare. */
export async function getRoomIdentityStatusByBookingIds(
  bookingIds: string[],
): Promise<Map<string, string[]>> {
  const batch = await loadCheckinEnrichmentByBookingIds(bookingIds);
  return batch.roomIdVerifiedByBooking;
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

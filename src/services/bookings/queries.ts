import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { GuestFlagLevel } from "@/domain/guest/types";
import { createAdminClient, createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import type { BookingStatus } from "@/domain/booking/types";
import { addDays, parseIso } from "@/lib/stay-dates";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  logAdminActivity,
  logAdminActivityFromSession,
} from "@/services/activity-log";
import {
  bookingHasSplitSegments,
  shiftAllSegmentsByDays,
  syncBookingRoomSegments,
} from "@/services/booking-segments";
import {
  assertValidGuestPhone,
  isValidGuestPhone,
  normalizePhone,
} from "@/domain/guest/normalize";
import { resolveGuestForBooking } from "@/services/guest-booking-resolve";
import {
  listGuestProfileSummaries,
  resolveGuestAlertSnapshot,
} from "@/services/guest-profiles";
import {
  assertRoomsAvailableForOccupancy,
} from "@/services/room-occupancy";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";
import { parseOperationalTimestamp } from "@/lib/operational-check";

import {
  BOOKING_ROW_SELECT,
  CERERE_LIST_PAGE_SELECT,
  BOOKING_ROW_WITH_UPDATED_SELECT,
  type BookingRow,
  type BookingSelectRow,
  type BookingDetail,
  type OperationalStayRow,
  type CompletedStayHistoryRow,
  type CancelledStayHistoryRow,
} from "./types";
import { mapBookingRows, attachGuestProfiles } from "./map";

async function listBookingsForRangeImpl(
  tenantId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .neq("status", "anulata")
    .lte("check_in", rangeEnd)
    .gte("check_out", rangeStart)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

const getCachedBookingsForRange = (
  tenantId: string,
  rangeStart: string,
  rangeEnd: string
) =>
  unstable_cache(
    () => listBookingsForRangeImpl(tenantId, rangeStart, rangeEnd),
    ["bookings-range", tenantId, rangeStart, rangeEnd],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 45,
    }
  );

const loadBookingsForRange = cache(
  (tenantId: string, rangeStart: string, rangeEnd: string) =>
    getCachedBookingsForRange(tenantId, rangeStart, rangeEnd)()
);

export async function listBookingsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const { tenantId } = await getTenantScope();
  return loadBookingsForRange(tenantId, rangeStart, rangeEnd);
}

const BOOKING_DETAIL_SELECT = `
  id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
  guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
  num_adults, num_children, has_minor, minor_age, notes, total_price,
  actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
  booking_rooms ( room_id, rooms ( name ) )
`;

type BookingDetailRow = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: string | null;
  guest_alert_level: GuestFlagLevel;
  guest_alert_note: string | null;
  num_adults: number;
  num_children: number;
  has_minor: boolean;
  minor_age: string | null;
  notes: string | null;
  total_price: number | null;
  actual_check_in_at: string | null;
  actual_check_out_at: string | null;
  actual_check_in_by: string | null;
  actual_check_out_by: string | null;
  booking_rooms:
    | {
        room_id: string;
        rooms: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

async function mapBookingDetailFromRow(
  data: BookingDetailRow
): Promise<BookingDetail> {
  const br = data.booking_rooms ?? [];
  const room_ids: string[] = [];
  const room_names: string[] = [];
  for (const line of br) {
    room_ids.push(line.room_id);
    const r = line.rooms;
    const name = Array.isArray(r) ? r[0]?.name : r?.name;
    if (name) room_names.push(name);
  }
  const profiles = await listGuestProfileSummaries(
    data.guest_id ? [String(data.guest_id)] : []
  );

  return {
    id: data.id,
    check_in: data.check_in,
    check_out: data.check_out,
    status: data.status as BookingStatus,
    guest_name: data.guest_name,
    guest_last_name: data.guest_last_name ?? null,
    guest_first_name: data.guest_first_name ?? null,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    guest_id: data.guest_id ?? null,
    guest_alert_level:
      data.guest_alert_level === "watchlist" || data.guest_alert_level === "blacklist"
        ? data.guest_alert_level
        : "normal",
    guest_alert_note: data.guest_alert_note ?? null,
    guest_profile: data.guest_id ? profiles.get(String(data.guest_id)) ?? null : null,
    num_adults: data.num_adults,
    num_children: data.num_children,
    has_minor: data.has_minor,
    minor_age: data.minor_age,
    notes: data.notes,
    total_price: data.total_price != null ? Number(data.total_price) : null,
    actual_check_in_at: data.actual_check_in_at ?? null,
    actual_check_out_at: data.actual_check_out_at ?? null,
    actual_check_in_by: data.actual_check_in_by ?? null,
    actual_check_out_by: data.actual_check_out_by ?? null,
    room_ids,
    room_names,
  };
}

const loadBookingById = cache(async (id: string): Promise<BookingDetail | null> => {
  const { data, error } = await getTenantScope().then(({ tenantId, supabase }) =>
    supabase
      .from("bookings")
      .select(BOOKING_DETAIL_SELECT)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle()
  );

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapBookingDetailFromRow(data as BookingDetailRow);
});

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  return loadBookingById(id);
}

const loadLatestBookingForGuest = cache(
  async (guestId: string): Promise<BookingDetail | null> => {
    const { data, error } = await getTenantScope().then(({ tenantId, supabase }) =>
      supabase
        .from("bookings")
        .select(BOOKING_DETAIL_SELECT)
        .eq("tenant_id", tenantId)
        .eq("guest_id", guestId)
        .neq("status", "anulata")
        .order("check_out", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (error) throw new Error(error.message);
    if (!data) return null;

    return mapBookingDetailFromRow(data as BookingDetailRow);
  }
);

/** Latest non-cancelled stay for a guest — one query (rebook flows). */
export async function getLatestBookingForGuest(
  guestId: string
): Promise<BookingDetail | null> {
  return loadLatestBookingForGuest(guestId);
}

export type BookingStayParams = {
  id: string;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
};

const loadBookingStayParams = cache(
  async (id: string): Promise<BookingStayParams | null> => {
    const { tenantId, supabase } = await getTenantScope();
    const { data, error } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, num_adults, num_children")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return data as BookingStayParams;
  }
);

/** Lightweight stay window — parallel with full getBookingById on confirm flows. */
export async function getBookingStayParams(
  id: string
): Promise<BookingStayParams | null> {
  return loadBookingStayParams(id);
}

async function countCereriNoiUncached(tenantId: string): Promise<number> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "cerere_noua");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const getCachedCereriCount = (tenantId: string) =>
  unstable_cache(
    () => countCereriNoiUncached(tenantId),
    ["cereri-count", tenantId],
    {
      tags: [CACHE_TAGS.bookingCounts, `tenant-${tenantId}-cereri`],
      revalidate: 30,
    }
  );

const loadCereriCount = cache((tenantId: string) =>
  getCachedCereriCount(tenantId)()
);

/** Per-request dedupe + 30s cross-request cache (busted via bookingCounts tag). */
export async function countCereriNoi(): Promise<number> {
  const { tenantId } = await getTenantScope();
  return loadCereriCount(tenantId);
}

/** Default page size for /admin/bookings — avoids loading the full queue at once. */
export const CERERE_LIST_PAGE_SIZE = 30;

/** Hard cap per page load — keeps guest profile batch bounded. */
export const CERERE_LIST_MAX_SHOWN = 200;

async function listCereriNoiUnassignedQuery(
  tenantId: string
): Promise<BookingRow[]> {
  const supabase = createPublicAdminClient();
  const [assignedResult, cereriResult] = await Promise.all([
    supabase
      .from("booking_rooms")
      .select("booking_id, bookings!inner(status)")
      .eq("tenant_id", tenantId)
      .eq("bookings.status", "cerere_noua"),
    supabase
      .from("bookings")
      .select(CERERE_LIST_PAGE_SELECT)
      .eq("tenant_id", tenantId)
      .eq("status", "cerere_noua")
      .order("check_in", { ascending: true })
      .limit(CERERE_LIST_MAX_SHOWN),
  ]);

  if (assignedResult.error) throw new Error(assignedResult.error.message);
  if (cereriResult.error) throw new Error(cereriResult.error.message);

  const assignedIds = new Set(
    (assignedResult.data ?? []).map((row) => String(row.booking_id))
  );
  const unassigned = ((cereriResult.data ?? []) as unknown as BookingSelectRow[]).filter(
    (row) => !assignedIds.has(row.id)
  );

  return attachGuestProfiles(mapBookingRows(unassigned));
}

const getCachedCereriUnassigned = (tenantId: string) =>
  unstable_cache(
    () => listCereriNoiUnassignedQuery(tenantId),
    ["cereri-unassigned", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

const loadUnassignedCereri = cache((tenantId: string) =>
  getCachedCereriUnassigned(tenantId)()
);

/** Cereri noi fără camere alocate — vizibile indiferent de perioada Gantt */
export async function listUnassignedCereri(): Promise<BookingRow[]> {
  const { tenantId } = await getTenantScope();
  return loadUnassignedCereri(tenantId);
}

async function listCereriNoiWithSelect(
  tenantId: string,
  select: string,
  options?: { limit?: number; offset?: number }
): Promise<BookingRow[]> {
  const supabase = createPublicAdminClient();
  let query = supabase
    .from("bookings")
    .select(select)
    .eq("tenant_id", tenantId)
    .eq("status", "cerere_noua")
    .order("created_at", { ascending: false });

  const limit = options?.limit;
  const offset = options?.offset ?? 0;
  if (limit != null) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return attachGuestProfiles(
    mapBookingRows((data ?? []) as unknown as BookingSelectRow[])
  );
}

const getCachedCereriPreview = (tenantId: string, limit: number) =>
  unstable_cache(
    () =>
      listCereriNoiWithSelect(tenantId, BOOKING_ROW_SELECT, { limit }),
    ["cereri-preview", tenantId, String(limit)],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

const loadCereriPreview = cache((tenantId: string, limit: number) =>
  getCachedCereriPreview(tenantId, limit)()
);

/** Paginated cereri for the bookings queue page (light select, no full-table scan). */
export async function listCereriNoiPage(
  limit = CERERE_LIST_PAGE_SIZE,
  offset = 0
): Promise<BookingRow[]> {
  const capped = Math.min(Math.max(1, limit), CERERE_LIST_MAX_SHOWN);
  const { tenantId } = await getTenantScope();
  return listCereriNoiWithSelect(tenantId, CERERE_LIST_PAGE_SELECT, {
    limit: capped,
    offset,
  });
}

/** @deprecated Prefer {@link listCereriNoiPage} — capped for safety. */
export async function listCereriNoi(): Promise<BookingRow[]> {
  return listCereriNoiPage(CERERE_LIST_MAX_SHOWN);
}

/** Recent cereri for dashboard preview — does not load the full queue. */
export async function listCereriNoiPreview(limit = 5): Promise<BookingRow[]> {
  const { tenantId } = await getTenantScope();
  return loadCereriPreview(tenantId, limit);
}

const loadOperationalStays = cache(async (): Promise<OperationalStayRow[]> => {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .in("status", ["cerere_noua", "confirmata"])
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = await attachGuestProfiles(
    mapBookingRows((data ?? []) as BookingSelectRow[]),
  );
  const { attachCheckinRecordState } = await import(
    "@/services/checkin/attach-booking-state"
  );
  return attachCheckinRecordState(rows);
});

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  return loadOperationalStays();
}

const loadRecentlyConfirmedStayHistory = cache(
  async (limit: number): Promise<CompletedStayHistoryRow[]> => {
    const [today, { tenantId, supabase }] = await Promise.all([
      getEffectiveToday(),
      getTenantScope(),
    ]);
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_ROW_SELECT)
      .eq("tenant_id", tenantId)
      .eq("status", "confirmata")
      .gte("check_out", today)
      .order("confirmed_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
  }
);

/** Cazări confirmate încă active/viitoare — pentru istoric lateral (nu doar checkout trecut). */
export async function listRecentlyConfirmedStayHistory(
  limit = 16
): Promise<CompletedStayHistoryRow[]> {
  return loadRecentlyConfirmedStayHistory(limit);
}

const loadCompletedStayHistory = cache(
  async (limit: number): Promise<CompletedStayHistoryRow[]> => {
    const [today, { tenantId, supabase }] = await Promise.all([
      getEffectiveToday(),
      getTenantScope(),
    ]);
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_ROW_SELECT)
      .eq("tenant_id", tenantId)
      .eq("status", "confirmata")
      .lt("check_out", today)
      .order("check_out", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
  }
);

/** Istoric cazări deja încheiate, util pentru sidebar-uri și recap rapid. */
export async function listCompletedStayHistory(
  limit = 24
): Promise<CompletedStayHistoryRow[]> {
  return loadCompletedStayHistory(limit);
}

const loadCancelledStayHistory = cache(
  async (limit: number): Promise<CancelledStayHistoryRow[]> => {
    const { tenantId, supabase } = await getTenantScope();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_ROW_WITH_UPDATED_SELECT)
      .eq("tenant_id", tenantId)
      .eq("status", "anulata")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    type RowWithUpdated = BookingSelectRow & { updated_at: string };
    const raw = (data ?? []) as unknown as RowWithUpdated[];
    const mapped = await attachGuestProfiles(mapBookingRows(raw));
    return mapped.map((row, index) => ({
      ...row,
      updated_at: raw[index]?.updated_at ?? new Date().toISOString(),
    }));
  }
);

/** Cereri/cazări anulate recent — pentru recontact când se eliberează loc. */
export async function listCancelledStayHistory(
  limit = 24
): Promise<CancelledStayHistoryRow[]> {
  return loadCancelledStayHistory(limit);
}


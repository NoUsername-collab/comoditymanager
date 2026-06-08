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
  const { supabase } = await getTenantScope();
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

export async function listBookingsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const { tenantId } = await getTenantScope();
  return getCachedBookingsForRange(tenantId, rangeStart, rangeEnd)();
}

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name,
      guest_email, guest_phone, guest_id, guest_alert_level, guest_alert_note,
      num_adults, num_children, has_minor, minor_age, notes, total_price,
      actual_check_in_at, actual_check_out_at, actual_check_in_by, actual_check_out_by,
      booking_rooms ( room_id, rooms ( name ) )
    `
    )
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const br = (data.booking_rooms ?? []) as {
    room_id: string;
    rooms: { name: string } | { name: string }[] | null;
  }[];
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

async function countCereriNoiUncached(tenantId: string): Promise<number> {
  const supabase = await createAdminClient();
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

export async function countCereriNoi(): Promise<number> {
  const { tenantId } = await getTenantScope();
  return getCachedCereriCount(tenantId)();
}

/** Cereri noi fără camere alocate — vizibile indiferent de perioada Gantt */
export async function listUnassignedCereri(): Promise<BookingRow[]> {
  const rows = await listCereriNoi();
  return rows
    .filter((b) => b.room_ids.length === 0)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
}

async function listCereriNoiImpl(tenantId: string): Promise<BookingRow[]> {
  const { supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "cerere_noua")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

const getCachedCereriList = (tenantId: string) =>
  unstable_cache(
    () => listCereriNoiImpl(tenantId),
    ["cereri-list", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

export async function listCereriNoi(): Promise<BookingRow[]> {
  const { tenantId } = await getTenantScope();
  return getCachedCereriList(tenantId)();
}

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .in("status", ["cerere_noua", "confirmata"])
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

/** Cazări confirmate încă active/viitoare — pentru istoric lateral (nu doar checkout trecut). */
export async function listRecentlyConfirmedStayHistory(
  limit = 16
): Promise<CompletedStayHistoryRow[]> {
  const today = await getEffectiveToday();
  const { tenantId, supabase } = await getTenantScope();
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

/** Istoric cazări deja încheiate, util pentru sidebar-uri și recap rapid. */
export async function listCompletedStayHistory(
  limit = 24
): Promise<CompletedStayHistoryRow[]> {
  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .eq("status", "confirmata")
    .lt("check_out", await getEffectiveToday())
    .order("check_out", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return attachGuestProfiles(mapBookingRows((data ?? []) as BookingSelectRow[]));
}

/** Cereri/cazări anulate recent — pentru recontact când se eliberează loc. */
export async function listCancelledStayHistory(
  limit = 24
): Promise<CancelledStayHistoryRow[]> {
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


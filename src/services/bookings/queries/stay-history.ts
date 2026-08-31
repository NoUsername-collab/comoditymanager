import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { addDays, todayIso } from "@/lib/stay-dates";
import { getTenantScope } from "@/lib/tenant/scope";

import {
  BOOKING_ROW_SELECT,
  CAZARI_LIST_SELECT,
  BOOKING_ROW_WITH_UPDATED_SELECT,
  type BookingSelectRow,
  type OperationalStayRow,
  type CompletedStayHistoryRow,
  type CancelledStayHistoryRow,
} from "../types";
import { mapBookingRows, attachGuestProfiles } from "../map";

const loadOperationalStays = cache(async (): Promise<OperationalStayRow[]> => {
  const { tenantId } = await getTenantScope();
  return loadOperationalStaysForTenant(tenantId);
});

async function listOperationalStaysImpl(
  tenantId: string,
): Promise<OperationalStayRow[]> {
  const [today, supabase] = await Promise.all([
    todayIso(),
    Promise.resolve(createPublicAdminClient()),
  ]);
  const horizonEnd = addDays(today, 365);
  const graceStart = addDays(today, -30);
  const { data, error } = await supabase
    .from("bookings")
    .select(CAZARI_LIST_SELECT)
    .eq("tenant_id", tenantId)
    .in("status", ["cerere_noua", "confirmata"])
    .or(
      `status.eq.cerere_noua,and(status.eq.confirmata,check_in.lte.${horizonEnd},check_out.gte.${graceStart})`,
    )
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = await attachGuestProfiles(
    mapBookingRows((data ?? []) as BookingSelectRow[]),
  );
  const { attachCheckinRecordState } = await import(
    "@/services/checkin/attach-booking-state"
  );
  try {
    return await attachCheckinRecordState(rows);
  } catch {
    return rows.map((stay) => ({
      ...stay,
      has_checkin_record: false,
      checked_in_rooms: [] as string[],
    }));
  }
}

const getCachedOperationalStays = (tenantId: string) =>
  unstable_cache(
    () => listOperationalStaysImpl(tenantId),
    ["operational-stays", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        CACHE_TAGS.checkins,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
        tenantTag(tenantId, CACHE_TAGS.checkins),
      ],
      revalidate: 60,
    },
  );

const loadOperationalStaysForTenant = cache(async (tenantId: string) => {
  return getCachedOperationalStays(tenantId)();
});

/** Cazări active: cereri noi + confirmate (fără anulate). */
export async function listOperationalStays(): Promise<OperationalStayRow[]> {
  return loadOperationalStays();
}

const loadRecentlyConfirmedStayHistory = cache(
  async (limit: number): Promise<CompletedStayHistoryRow[]> => {
    const { tenantId } = await getTenantScope();
    return loadRecentlyConfirmedStayHistoryForTenant(tenantId, limit);
  },
);

async function listRecentlyConfirmedStayHistoryImpl(
  tenantId: string,
  limit: number,
): Promise<CompletedStayHistoryRow[]> {
  const [today, supabase] = await Promise.all([
    todayIso(),
    Promise.resolve(createPublicAdminClient()),
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

const getCachedRecentlyConfirmedHistory = (tenantId: string, limit: number) =>
  unstable_cache(
    () => listRecentlyConfirmedStayHistoryImpl(tenantId, limit),
    ["cazari-recent-confirmed", tenantId, String(limit)],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 45,
    },
  );

const loadRecentlyConfirmedStayHistoryForTenant = cache(
  (tenantId: string, limit: number) =>
    getCachedRecentlyConfirmedHistory(tenantId, limit)(),
);

/** Cazări confirmate încă active/viitoare — pentru istoric lateral (nu doar checkout trecut). */
export async function listRecentlyConfirmedStayHistory(
  limit = 16
): Promise<CompletedStayHistoryRow[]> {
  return loadRecentlyConfirmedStayHistory(limit);
}

const loadCompletedStayHistory = cache(
  async (limit: number): Promise<CompletedStayHistoryRow[]> => {
    const { tenantId } = await getTenantScope();
    return loadCompletedStayHistoryForTenant(tenantId, limit);
  },
);

async function listCompletedStayHistoryImpl(
  tenantId: string,
  limit: number,
): Promise<CompletedStayHistoryRow[]> {
  const [today, supabase] = await Promise.all([
    todayIso(),
    Promise.resolve(createPublicAdminClient()),
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

const getCachedCompletedStayHistory = (tenantId: string, limit: number) =>
  unstable_cache(
    () => listCompletedStayHistoryImpl(tenantId, limit),
    ["cazari-completed-history", tenantId, String(limit)],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 60,
    },
  );

const loadCompletedStayHistoryForTenant = cache((tenantId: string, limit: number) =>
  getCachedCompletedStayHistory(tenantId, limit)(),
);

/** Istoric cazări deja încheiate, util pentru sidebar-uri și recap rapid. */
export async function listCompletedStayHistory(
  limit = 24
): Promise<CompletedStayHistoryRow[]> {
  return loadCompletedStayHistory(limit);
}

const loadCancelledStayHistory = cache(
  async (limit: number): Promise<CancelledStayHistoryRow[]> => {
    const { tenantId } = await getTenantScope();
    return loadCancelledStayHistoryForTenant(tenantId, limit);
  },
);

async function listCancelledStayHistoryImpl(
  tenantId: string,
  limit: number,
): Promise<CancelledStayHistoryRow[]> {
  const supabase = createPublicAdminClient();
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

const getCachedCancelledStayHistory = (tenantId: string, limit: number) =>
  unstable_cache(
    () => listCancelledStayHistoryImpl(tenantId, limit),
    ["cazari-cancelled-history", tenantId, String(limit)],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 60,
    },
  );

const loadCancelledStayHistoryForTenant = cache((tenantId: string, limit: number) =>
  getCachedCancelledStayHistory(tenantId, limit)(),
);

/** Cereri/cazări anulate recent — pentru recontact când se eliberează loc. */
export async function listCancelledStayHistory(
  limit = 24
): Promise<CancelledStayHistoryRow[]> {
  return loadCancelledStayHistory(limit);
}

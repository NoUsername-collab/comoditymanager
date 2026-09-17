import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";

import {
  BOOKING_ROW_SELECT,
  CERERE_LIST_PAGE_SELECT,
  type BookingRow,
  type BookingSelectRow,
} from "../types";
import { mapBookingRows, attachGuestProfiles } from "../map";

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
  const tenantId = await resolveTenantIdForData();
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
  const tenantId = await resolveTenantIdForData();
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
  const tenantId = await resolveTenantIdForData();
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
  const tenantId = await resolveTenantIdForData();
  return loadCereriPreview(tenantId, limit);
}

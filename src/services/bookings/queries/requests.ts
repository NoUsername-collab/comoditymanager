import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getTenantScope } from "@/lib/tenant/scope";

import {
  BOOKING_ROW_SELECT,
  REQUEST_LIST_PAGE_SELECT,
  type BookingRow,
  type BookingSelectRow,
} from "../types";
import { mapBookingRows, attachGuestProfiles } from "../map";

async function countNewRequestsUncached(tenantId: string): Promise<number> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "cerere_noua");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

const getCachedNewRequestCount = (tenantId: string) =>
  unstable_cache(
    () => countNewRequestsUncached(tenantId),
    ["new-request-count", tenantId],
    {
      tags: [CACHE_TAGS.bookingCounts, `tenant-${tenantId}-requests`],
      revalidate: 30,
    }
  );

const loadNewRequestCount = cache((tenantId: string) =>
  getCachedNewRequestCount(tenantId)()
);

/** Per-request dedupe + 30s cross-request cache (busted via bookingCounts tag). */
export async function countNewRequests(): Promise<number> {
  const tenantId = await resolveTenantIdForData();
  return loadNewRequestCount(tenantId);
}

/** Default page size for /admin/bookings — avoids loading the full queue at once. */
export const REQUEST_LIST_PAGE_SIZE = 30;

/** Hard cap per page load — keeps guest profile batch bounded. */
export const REQUEST_LIST_MAX_SHOWN = 200;

async function listNewRequestsUnassignedQuery(
  tenantId: string
): Promise<BookingRow[]> {
  const supabase = createPublicAdminClient();
  const [assignedResult, requestResult] = await Promise.all([
    supabase
      .from("booking_rooms")
      .select("booking_id, bookings!inner(status)")
      .eq("tenant_id", tenantId)
      .eq("bookings.status", "cerere_noua"),
    supabase
      .from("bookings")
      .select(REQUEST_LIST_PAGE_SELECT)
      .eq("tenant_id", tenantId)
      .eq("status", "cerere_noua")
      .order("check_in", { ascending: true })
      .limit(REQUEST_LIST_MAX_SHOWN),
  ]);

  if (assignedResult.error) throw new Error(assignedResult.error.message);
  if (requestResult.error) throw new Error(requestResult.error.message);

  const assignedIds = new Set(
    (assignedResult.data ?? []).map((row) => String(row.booking_id))
  );
  const unassigned = ((requestResult.data ?? []) as unknown as BookingSelectRow[]).filter(
    (row) => !assignedIds.has(row.id)
  );

  return attachGuestProfiles(mapBookingRows(unassigned));
}

const getCachedUnassignedRequests = (tenantId: string) =>
  unstable_cache(
    () => listNewRequestsUnassignedQuery(tenantId),
    ["new-requests-unassigned", tenantId],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

const loadUnassignedRequests = cache((tenantId: string) =>
  getCachedUnassignedRequests(tenantId)()
);

/** New requests with no rooms assigned — visible regardless of the Gantt range. */
export async function listUnassignedRequests(): Promise<BookingRow[]> {
  const tenantId = await resolveTenantIdForData();
  return loadUnassignedRequests(tenantId);
}

async function listNewRequestsWithSelect(
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

const getCachedNewRequestPreview = (tenantId: string, limit: number) =>
  unstable_cache(
    () =>
      listNewRequestsWithSelect(tenantId, BOOKING_ROW_SELECT, { limit }),
    ["new-requests-preview", tenantId, String(limit)],
    {
      tags: [
        CACHE_TAGS.bookingCounts,
        tenantTag(tenantId, CACHE_TAGS.bookingCounts),
      ],
      revalidate: 30,
    }
  );

const loadNewRequestPreview = cache((tenantId: string, limit: number) =>
  getCachedNewRequestPreview(tenantId, limit)()
);

/** Paginated new requests for the bookings queue (light select, no full-table scan). */
export async function listNewRequestsPage(
  limit = REQUEST_LIST_PAGE_SIZE,
  offset = 0
): Promise<BookingRow[]> {
  const capped = Math.min(Math.max(1, limit), REQUEST_LIST_MAX_SHOWN);
  const tenantId = await resolveTenantIdForData();
  return listNewRequestsWithSelect(tenantId, REQUEST_LIST_PAGE_SELECT, {
    limit: capped,
    offset,
  });
}

/** @deprecated Prefer {@link listNewRequestsPage} — capped for safety. */
export async function listNewRequests(): Promise<BookingRow[]> {
  return listNewRequestsPage(REQUEST_LIST_MAX_SHOWN);
}

/** Recent new requests for dashboard preview — does not load the full queue. */
export async function listNewRequestsPreview(limit = 5): Promise<BookingRow[]> {
  const tenantId = await resolveTenantIdForData();
  return loadNewRequestPreview(tenantId, limit);
}

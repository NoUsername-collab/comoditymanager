import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { isSimActive } from "@/domain/simulation/sim-cookie";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { getTenantScope } from "@/lib/tenant/scope";

import {
  GANTT_BOOKING_ROW_SELECT,
  type BookingRow,
  type BookingSelectRow,
} from "../types";
import { mapBookingRows } from "../map";

async function listBookingsForRangeImpl(
  tenantId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<BookingRow[]> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(GANTT_BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .neq("status", "anulata")
    .lte("check_in", rangeEnd)
    .gte("check_out", rangeStart)
    .order("check_in", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = mapBookingRows((data ?? []) as BookingSelectRow[]);
  const { attachCheckinRecordState } = await import(
    "@/services/checkin/attach-booking-state"
  );
  try {
    return await attachCheckinRecordState(rows);
  } catch {
    return rows;
  }
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
  if (await isSimActive()) {
    return listBookingsForRangeImpl(tenantId, rangeStart, rangeEnd);
  }
  return loadBookingsForRange(tenantId, rangeStart, rangeEnd);
}

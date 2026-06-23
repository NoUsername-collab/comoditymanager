import { attachCheckinRecordState } from "@/services/checkin/attach-booking-state";
import { getTenantScope } from "@/lib/tenant/scope";
import { mapBookingRows } from "./map";
import type { BookingRow, BookingSelectRow } from "./types";
import { GANTT_BOOKING_ROW_SELECT } from "./types";

/** Single booking row for Gantt optimistic patch - one query + light check-in attach. */
export async function loadGanttBookingRow(
  bookingId: string,
): Promise<BookingRow | null> {
  if (!bookingId) return null;

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("bookings")
    .select(GANTT_BOOKING_ROW_SELECT)
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [row] = mapBookingRows([data as BookingSelectRow]);
  if (!row) return null;

  const [enriched] = await attachCheckinRecordState([row]);
  return enriched ?? row;
}
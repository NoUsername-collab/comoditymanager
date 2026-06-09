import { bookingRoomNames } from "@/domain/checkin/room-checkin-progress";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { getTenantScope } from "@/lib/tenant/scope";
import type { BookingRow } from "@/services/bookings/types";
import { getCheckedInRoomsByBookingIds } from "./queries";
import { syncBookingOperativeCheckInFromRecord } from "./sync";

type CheckinLite = {
  booking_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
};

function attachCheckinFields(
  stays: BookingRow[],
  latestByBooking: Map<string, CheckinLite>,
  checkedRoomsByBooking: Map<string, string[]>,
): BookingRow[] {
  return stays.map((stay) => {
    const checkin = latestByBooking.get(stay.id);
    const has_checkin_record = !!checkin;
    const actual_check_in_at =
      stay.actual_check_in_at ?? checkin?.checked_in_at ?? null;

    let checked_in_rooms = checkedRoomsByBooking.get(stay.id) ?? [];
    const rooms = bookingRoomNames(stay.room_names);
    if (
      has_checkin_record &&
      checked_in_rooms.length === 0 &&
      rooms.length === 1
    ) {
      checked_in_rooms = [rooms[0]];
    }

    return {
      ...stay,
      has_checkin_record,
      actual_check_in_at,
      checked_in_rooms,
    };
  });
}

/**
 * Marchează cazările cu rând în checkins, camerele recepționate și repară bookings fără actual_check_in_at.
 * Nu aruncă dacă schema check-in e incompletă (migrări 048/052 neaplicate).
 */
export async function attachCheckinRecordState(
  stays: BookingRow[],
): Promise<BookingRow[]> {
  if (!stays.length) return stays;

  try {
    const { tenantId, supabase } = await getTenantScope();
    const bookingIds = stays.map((s) => s.id);

    const [{ data, error }, checkedRoomsByBooking] = await Promise.all([
      supabase
        .from("checkins")
        .select("booking_id, checked_in_at, checked_in_by")
        .eq("tenant_id", tenantId)
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false }),
      getCheckedInRoomsByBookingIds(bookingIds).catch(
        () => new Map<string, string[]>(),
      ),
    ]);

    if (error) {
      if (isCheckinMigrationMissing(error.message)) {
        return stays.map((stay) => ({
          ...stay,
          has_checkin_record: false,
          checked_in_rooms: [],
        }));
      }
      throw new Error(error.message);
    }

    const latestByBooking = new Map<string, CheckinLite>();
    for (const row of data ?? []) {
      const bookingId = row.booking_id as string;
      if (!latestByBooking.has(bookingId)) {
        latestByBooking.set(bookingId, {
          booking_id: bookingId,
          checked_in_at: row.checked_in_at as string,
          checked_in_by: (row.checked_in_by as string | null) ?? null,
        });
      }
    }

    const orphans = stays.filter(
      (stay) => latestByBooking.has(stay.id) && !stay.actual_check_in_at,
    );

    if (orphans.length > 0) {
      await Promise.allSettled(
        orphans.map((stay) =>
          syncBookingOperativeCheckInFromRecord(
            stay.id,
            latestByBooking.get(stay.id) ?? null,
          ),
        ),
      );
    }

    return attachCheckinFields(stays, latestByBooking, checkedRoomsByBooking);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isCheckinMigrationMissing(message)) {
      return stays.map((stay) => ({
        ...stay,
        has_checkin_record: false,
        checked_in_rooms: [],
      }));
    }
    throw err;
  }
}

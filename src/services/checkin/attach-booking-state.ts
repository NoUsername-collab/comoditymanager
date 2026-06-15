import { bookingRoomNames } from "@/domain/checkin/room-checkin-progress";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { getTenantScope } from "@/lib/tenant/scope";
import type { BookingRow } from "@/services/bookings/types";
import { getCheckedInRoomsByBookingIds, getKeysHandedRoomsByBookingIds, getRoomIdentityStatusByBookingIds } from "./queries";
import { syncBookingOperativeCheckInFromRecord } from "./sync";

type CheckinLite = {
  booking_id: string;
  checked_in_at: string;
  checked_in_by: string | null;
  payment_status: StoredPaymentStatus | null;
};

function attachCheckinFields(
  stays: BookingRow[],
  latestByBooking: Map<string, CheckinLite>,
  checkedRoomsByBooking: Map<string, string[]>,
  keysHandedByBooking: Map<string, string[]>,
  identityByGuest: Map<string, GuestIdentityStatus>,
  roomIdVerifiedByBooking: Map<string, string[]>,
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
      keys_handed_rooms: keysHandedByBooking.get(stay.id) ?? [],
      checkin_payment_status: checkin?.payment_status ?? null,
      room_id_verified: roomIdVerifiedByBooking.get(stay.id) ?? [],
      guest_identity_status: stay.guest_id
        ? identityByGuest.get(stay.guest_id) ?? "draft"
        : null,
    };
  });
}

async function loadGuestIdentityStatuses(
  guestIds: string[],
): Promise<Map<string, GuestIdentityStatus>> {
  const map = new Map<string, GuestIdentityStatus>();
  if (!guestIds.length) return map;

  const { tenantId, supabase } = await getTenantScope();
  const { data, error } = await supabase
    .from("guests")
    .select("id, identity_status")
    .eq("tenant_id", tenantId)
    .in("id", guestIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const id = row.id as string;
    map.set(
      id,
      (row.identity_status as GuestIdentityStatus | null) ?? "draft",
    );
  }

  return map;
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

    const guestIds = [
      ...new Set(
        stays.map((stay) => stay.guest_id).filter(Boolean) as string[],
      ),
    ];

    const [{ data, error }, checkedRoomsByBooking, keysHandedByBooking, identityByGuest, roomIdVerifiedByBooking] =
      await Promise.all([
        supabase
          .from("checkins")
          .select("booking_id, checked_in_at, checked_in_by, payment_status")
          .eq("tenant_id", tenantId)
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false }),
        getCheckedInRoomsByBookingIds(bookingIds).catch(
          () => new Map<string, string[]>(),
        ),
        getKeysHandedRoomsByBookingIds(bookingIds).catch(
          () => new Map<string, string[]>(),
        ),
        loadGuestIdentityStatuses(guestIds).catch(
          () => new Map<string, GuestIdentityStatus>(),
        ),
        getRoomIdentityStatusByBookingIds(bookingIds).catch(
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
          payment_status:
            (row.payment_status as StoredPaymentStatus | null) ?? null,
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

    return attachCheckinFields(
      stays,
      latestByBooking,
      checkedRoomsByBooking,
      keysHandedByBooking,
      identityByGuest,
      roomIdVerifiedByBooking,
    );
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

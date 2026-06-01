import { assertRoomsAvailableForOccupancy } from "@/services/room-occupancy";

export async function assertRoomsAvailableForStay(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
  excludeBookingId?: string
): Promise<void> {
  await assertRoomsAvailableForOccupancy(
    checkIn,
    checkOut,
    roomIds,
    excludeBookingId
  );
}

/** Alocă camere pe cerere (soft hold) — blochează calendarul până la confirmare/anulare. */

import { parseIso } from "@/lib/stay-dates";

type ConflictBooking = {
  status: string;
  room_ids: string[];
  check_in: string;
  check_out: string;
};

/** Night count between check-in and check-out (exclusive end). */
export function ganttQuickNightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    0,
    Math.round(
      (parseIso(checkOut).getTime() - parseIso(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

export function resolveGanttQuickActiveRoomIds(input: {
  draftRoomIds?: string[];
  activeRoomId: string;
}): string[] {
  if (input.draftRoomIds?.length) return input.draftRoomIds;
  return input.activeRoomId ? [input.activeRoomId] : [];
}

export function hasGanttQuickIntervalConflict(input: {
  checkIn: string;
  checkOut: string;
  roomIds: string[];
  bookings: ConflictBooking[];
}): boolean {
  if (!input.checkIn || !input.checkOut || input.checkIn >= input.checkOut) {
    return false;
  }
  if (input.roomIds.length === 0) return false;

  return input.bookings.some(
    (booking) =>
      booking.status !== "anulata" &&
      booking.room_ids.some((id) => input.roomIds.includes(id)) &&
      booking.check_in < input.checkOut &&
      booking.check_out > input.checkIn
  );
}

export function isGanttQuickIntervalInvalid(
  checkIn: string,
  checkOut: string
): boolean {
  return !checkIn || !checkOut || checkIn >= checkOut;
}

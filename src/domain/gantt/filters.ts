import { nightOccupied, todayIso } from "@/lib/stay-dates";
import type { BookingRow } from "@/services/bookings";
import type { GanttRoom } from "@/domain/gantt/types";

export type GanttFilter = "all" | "occupied" | "free";

export function focusDayInRange(dayIsos: string[]): string {
  const today = todayIso();
  if (dayIsos.includes(today)) return today;
  return dayIsos[Math.floor(dayIsos.length / 2)] ?? today;
}

export function filterGanttRooms(
  rooms: GanttRoom[],
  bookings: BookingRow[],
  filter: GanttFilter,
  focusIso: string
): GanttRoom[] {
  if (filter === "all") return rooms;

  return rooms.filter((room) => {
    const occupied = bookings.some(
      (b) =>
        b.status !== "anulata" &&
        b.room_ids.includes(room.id) &&
        nightOccupied(focusIso, b.check_in, b.check_out)
    );
    return filter === "occupied" ? occupied : !occupied;
  });
}

import { nightOccupied, todayIso } from "@/lib/stay-dates";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { BookingRow } from "@/services/bookings";
import type { GanttRoom } from "@/domain/gantt/types";

export type GanttFilter = "all" | "occupied" | "free";

export type GanttFeatureFilter = "all" | "ac" | "fridge";

export function filterGanttRoomsByFeature(
  rooms: GanttRoom[],
  feature: GanttFeatureFilter
): GanttRoom[] {
  if (feature === "all") return rooms;
  return rooms.filter((room) => {
    const slugs = new Set(room.option_slugs ?? []);
    if (room.has_ac) slugs.add("ac");
    return slugs.has(feature);
  });
}

export function focusDayInRange(dayIsos: string[]): string {
  const today = todayIso();
  if (dayIsos.includes(today)) return today;
  return dayIsos[Math.floor(dayIsos.length / 2)] ?? today;
}

export function filterGanttRooms(
  rooms: GanttRoom[],
  bookings: BookingRow[],
  filter: GanttFilter,
  focusIso: string,
  occupancy: OccupancySegment[] = []
): GanttRoom[] {
  if (filter === "all") return rooms;

  return rooms.filter((room) => {
    const bookingOcc = bookings.some(
      (b) =>
        b.status !== "anulata" &&
        b.room_ids.includes(room.id) &&
        nightOccupied(focusIso, b.check_in, b.check_out)
    );
    const overlayOcc = occupancy.some(
      (s) =>
        s.roomId === room.id &&
        nightOccupied(focusIso, s.checkIn, s.checkOut)
    );
    const occupied = bookingOcc || overlayOcc;
    return filter === "occupied" ? occupied : !occupied;
  });
}

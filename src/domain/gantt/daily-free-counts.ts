import { nightOccupied } from "@/lib/stay-dates";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { BookingRow } from "@/services/bookings";
import type { GanttRoom } from "@/domain/gantt/types";

export type DailyFreeCount = {
  iso: string;
  free: number;
  total: number;
  occupied: number;
};

export function computeDailyFreeCounts(
  rooms: GanttRoom[],
  bookings: BookingRow[],
  occupancy: OccupancySegment[],
  dayIsos: string[]
): DailyFreeCount[] {
  const total = rooms.length;
  if (total === 0) {
    return dayIsos.map((iso) => ({ iso, free: 0, total: 0, occupied: 0 }));
  }

  return dayIsos.map((iso) => {
    let occupied = 0;
    for (const room of rooms) {
      const bookingOcc = bookings.some(
        (b) =>
          b.status !== "anulata" &&
          b.room_ids.includes(room.id) &&
          nightOccupied(iso, b.check_in, b.check_out)
      );
      const overlayOcc = occupancy.some(
        (s) =>
          s.roomId === room.id &&
          nightOccupied(iso, s.checkIn, s.checkOut)
      );
      if (bookingOcc || overlayOcc) occupied += 1;
    }
    return { iso, free: total - occupied, total, occupied };
  });
}

/** Nivel culoare pentru celula sumar — verde = multe libere, roșu = plin. */
export function dailyFreeHeatLevel(
  free: number,
  total: number
): "high" | "mid" | "low" | "full" {
  if (total === 0) return "mid";
  if (free === 0) return "full";
  const ratio = free / total;
  if (free >= 3 && ratio >= 0.35) return "high";
  if (ratio >= 0.15 || free >= 2) return "mid";
  return "low";
}

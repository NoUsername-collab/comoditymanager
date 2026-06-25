import { addDays, nightOccupied } from "@/lib/stay-dates";
import type { BookingRow } from "@/domain/booking/row";
import type { OccupancySegment } from "@/domain/occupancy/types";
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

  const roomSet = new Set(rooms.map((room) => room.id));
  const occupiedByDay = new Map<string, Set<string>>();
  for (const iso of dayIsos) {
    occupiedByDay.set(iso, new Set());
  }

  for (const booking of bookings) {
    if (booking.status === "anulata") continue;
    for (const roomId of booking.room_ids) {
      if (!roomSet.has(roomId)) continue;
      for (const iso of dayIsos) {
        if (nightOccupied(iso, booking.check_in, booking.check_out)) {
          occupiedByDay.get(iso)?.add(roomId);
        }
      }
    }
  }

  for (const segment of occupancy) {
    if (!roomSet.has(segment.roomId)) continue;
    for (const iso of dayIsos) {
      if (nightOccupied(iso, segment.checkIn, segment.checkOut)) {
        occupiedByDay.get(iso)?.add(segment.roomId);
      }
    }
  }

  return dayIsos.map((iso) => {
    const occupied = occupiedByDay.get(iso)?.size ?? 0;
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

/** Aggregate daily free counts into week columns (min free = busiest day in week). */
export function aggregateWeeklyFreeCounts(
  dailyCounts: DailyFreeCount[],
  weekStartIsos: string[]
): DailyFreeCount[] {
  return weekStartIsos.map((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const inWeek = dailyCounts.filter(
      (c) => c.iso >= weekStart && c.iso <= weekEnd
    );
    if (inWeek.length === 0) {
      return { iso: weekStart, free: 0, total: 0, occupied: 0 };
    }
    const minFree = Math.min(...inWeek.map((c) => c.free));
    const total = inWeek[0]?.total ?? 0;
    return {
      iso: weekStart,
      free: minFree,
      total,
      occupied: total - minFree,
    };
  });
}

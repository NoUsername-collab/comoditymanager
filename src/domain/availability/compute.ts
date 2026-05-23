import { nightOccupied } from "@/lib/stay-dates";
import {
  availabilityPressure,
  occupancyPercent,
  type AvailabilityPressure,
} from "@/domain/availability/heat";
import { dayInitialFromIso } from "@/lib/ro-calendar";

export type AvailRoomInput = {
  id: string;
  building_id: string;
  is_active: boolean;
};

export type OccupiedRange = {
  room_id: string;
  check_in: string;
  check_out: string;
};

export type DayCounts = {
  checkins: number;
  checkouts: number;
  unassigned_cereri: number;
  pending_cereri: number;
};

export type ComputedDay = {
  iso: string;
  day: number;
  weekday: string;
  free_rooms: number;
  total_rooms: number;
  occupied_rooms: number;
  occupancy_pct: number;
  pressure: AvailabilityPressure;
  status: "available" | "full";
  checkins: number;
  checkouts: number;
  unassigned_cereri: number;
  pending_cereri: number;
};

export function filterRoomsByBuilding<T extends AvailRoomInput>(
  rooms: T[],
  buildingId: string | null
): T[] {
  if (!buildingId) return rooms.filter((r) => r.is_active);
  return rooms.filter((r) => r.is_active && r.building_id === buildingId);
}

export function countOccupiedOnNight(
  iso: string,
  roomIds: string[],
  occupied: OccupiedRange[]
): number {
  let n = 0;
  for (const id of roomIds) {
    if (
      occupied.some(
        (o) => o.room_id === id && nightOccupied(iso, o.check_in, o.check_out)
      )
    ) {
      n += 1;
    }
  }
  return n;
}

export function computeDayAvailability(
  iso: string,
  dayNum: number,
  rooms: AvailRoomInput[],
  occupied: OccupiedRange[],
  counts: DayCounts
): ComputedDay {
  const active = rooms.filter((r) => r.is_active);
  const total = active.length;
  const occupiedCount = countOccupiedOnNight(
    iso,
    active.map((r) => r.id),
    occupied
  );
  const free = total - occupiedCount;
  const pressure = availabilityPressure(free, total);

  return {
    iso,
    day: dayNum,
    weekday: dayInitialFromIso(iso),
    free_rooms: free,
    total_rooms: total,
    occupied_rooms: occupiedCount,
    occupancy_pct: occupancyPercent(occupiedCount, total),
    pressure,
    status: free > 0 ? "available" : "full",
    checkins: counts.checkins,
    checkouts: counts.checkouts,
    unassigned_cereri: counts.unassigned_cereri,
    pending_cereri: counts.pending_cereri,
  };
}

export function minFreeAcrossDays(days: ComputedDay[]): {
  min: number;
  iso: string | null;
} {
  if (days.length === 0) return { min: 0, iso: null };
  let min = days[0]!.free_rooms;
  let iso = days[0]!.iso;
  for (const d of days) {
    if (d.free_rooms < min) {
      min = d.free_rooms;
      iso = d.iso;
    }
  }
  return { min, iso };
}

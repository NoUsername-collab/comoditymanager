import type { BookingRow } from "@/services/bookings";
import type { GanttFilter } from "@/domain/gantt/filters";
import { focusDayInRange } from "@/domain/gantt/filters";
import {
  filterOccupancyForLayer,
  type GanttLayerFilter,
} from "@/domain/gantt/occupancy-layer";
import type { OccupancySegment } from "@/domain/occupancy/types";
import type { GanttRoom } from "@/domain/gantt/types";
import type { RoomTodayFlags } from "@/domain/gantt/today-activity";
import { computeDailyFreeCounts } from "@/domain/gantt/daily-free-counts";
import { filterBookingsForOperativeCheckIn } from "@/domain/booking/operative-checkin";
import { summarizeGanttToday } from "@/domain/gantt/today-activity";
import { nightOccupied } from "@/lib/stay-dates";
import type { AcMode } from "@/types/database";

export type GanttBuildingGroup = {
  buildingId: string;
  buildingName: string;
  buildingColor: string | null;
  buildingAcMode: AcMode;
  hasAnyRoomAc: boolean;
  rooms: GanttRoom[];
};

export function deriveActiveBookings(bookings: BookingRow[]): BookingRow[] {
  return bookings.filter((booking) => booking.status !== "anulata");
}

export function deriveBookingsByRoom(
  activeBookings: BookingRow[]
): Map<string, BookingRow[]> {
  const map = new Map<string, BookingRow[]>();
  for (const booking of activeBookings) {
    for (const roomId of booking.room_ids) {
      const list = map.get(roomId);
      if (list) list.push(booking);
      else map.set(roomId, [booking]);
    }
  }
  return map;
}

export function deriveOccupancyByRoom(
  occupancy: OccupancySegment[]
): Map<string, OccupancySegment[]> {
  const map = new Map<string, OccupancySegment[]>();
  for (const segment of occupancy) {
    const list = map.get(segment.roomId);
    if (list) list.push(segment);
    else map.set(segment.roomId, [segment]);
  }
  return map;
}

export function deriveDisplaySegmentsByRoom(
  occupancy: OccupancySegment[],
  layerFilter: GanttLayerFilter,
  effectiveToday: string
): {
  stay: Map<string, OccupancySegment[]>;
  overlay: Map<string, OccupancySegment[]>;
} {
  const stay = new Map<string, OccupancySegment[]>();
  const overlay = new Map<string, OccupancySegment[]>();
  for (const segment of filterOccupancyForLayer(
    occupancy,
    layerFilter,
    effectiveToday
  )) {
    const target =
      segment.kind === "request" || segment.kind === "stay" ? stay : overlay;
    const list = target.get(segment.roomId);
    if (list) list.push(segment);
    else target.set(segment.roomId, [segment]);
  }
  return { stay, overlay };
}

export function deriveOccupiedRoomIdsOnFocus(
  focusIso: string,
  bookingsByRoom: Map<string, BookingRow[]>,
  occupancyByRoom: Map<string, OccupancySegment[]>
): Set<string> {
  const occupied = new Set<string>();
  for (const [roomId, roomBookings] of bookingsByRoom) {
    if (
      roomBookings.some((booking) =>
        nightOccupied(focusIso, booking.check_in, booking.check_out)
      )
    ) {
      occupied.add(roomId);
    }
  }
  for (const [roomId, segments] of occupancyByRoom) {
    if (
      segments.some((segment) =>
        nightOccupied(focusIso, segment.checkIn, segment.checkOut)
      )
    ) {
      occupied.add(roomId);
    }
  }
  return occupied;
}

export function deriveFilteredRooms(
  rooms: GanttRoom[],
  filter: GanttFilter,
  occupiedRoomIdsOnFocus: Set<string>
): GanttRoom[] {
  if (filter === "all") return rooms;
  return rooms.filter((room) =>
    filter === "occupied"
      ? occupiedRoomIdsOnFocus.has(room.id)
      : !occupiedRoomIdsOnFocus.has(room.id)
  );
}

export function deriveTodayFlagsByRoom(
  rooms: GanttRoom[],
  bookingsByRoom: Map<string, BookingRow[]>,
  todayIso: string
): Map<string, RoomTodayFlags> {
  const map = new Map<string, RoomTodayFlags>();
  for (const room of rooms) {
    const roomBookings = bookingsByRoom.get(room.id) ?? [];
    map.set(room.id, {
      arrival: roomBookings.some((booking) => booking.check_in === todayIso),
      departure: roomBookings.some((booking) => booking.check_out === todayIso),
      occupiedTonight: roomBookings.some((booking) =>
        nightOccupied(todayIso, booking.check_in, booking.check_out)
      ),
    });
  }
  return map;
}

export function deriveBuildingGroups(
  filteredRooms: GanttRoom[],
  groupByBuilding: boolean,
  buildingFallbackLabel: string,
  buildings: { id: string; sort_order: number }[] = []
): GanttBuildingGroup[] {
  if (!groupByBuilding) return [];

  const groups = Array.from(
    filteredRooms.reduce((map, room) => {
      const list = map.get(room.building_id) ?? [];
      list.push(room);
      map.set(room.building_id, list);
      return map;
    }, new Map<string, GanttRoom[]>())
  ).map(([buildingId, buildingRooms]) => ({
    buildingId,
    buildingName: buildingRooms[0]?.building_name ?? buildingFallbackLabel,
    buildingColor: buildingRooms[0]?.building_color ?? null,
    buildingAcMode: buildingRooms[0]?.building_ac_mode ?? "per_room",
    hasAnyRoomAc: buildingRooms.some((r) => r.has_ac),
    rooms: buildingRooms,
  }));

  if (!buildings.length) return groups;

  const buildingRank = new Map(
    buildings.map((building) => [building.id, building.sort_order] as const)
  );

  return groups.sort((a, b) => {
    const rankDelta =
      (buildingRank.get(a.buildingId) ?? Number.MAX_SAFE_INTEGER) -
      (buildingRank.get(b.buildingId) ?? Number.MAX_SAFE_INTEGER);
    if (rankDelta !== 0) return rankDelta;
    return a.buildingName.localeCompare(b.buildingName, "ro");
  });
}

export function deriveGanttFocusIso(
  dayIsos: string[],
  effectiveToday: string,
  filter: GanttFilter,
  focusDay: string | null
): string {
  const defaultFocusIso = focusDayInRange(dayIsos, effectiveToday);
  return filter !== "all" && focusDay ? focusDay : defaultFocusIso;
}

export function deriveGanttCalendarData(input: {
  rooms: GanttRoom[];
  bookings: BookingRow[];
  occupancy: OccupancySegment[];
  dayIsos: string[];
  effectiveToday: string;
  filter: GanttFilter;
  layerFilter: GanttLayerFilter;
  focusDay: string | null;
  groupByBuilding: boolean;
  buildingFallbackLabel: string;
  buildings?: { id: string; sort_order: number }[];
}) {
  const activeBookings = deriveActiveBookings(input.bookings);
  const bookingsByRoom = deriveBookingsByRoom(activeBookings);
  const occupancyByRoom = deriveOccupancyByRoom(input.occupancy);
  const displaySegmentsByRoom = deriveDisplaySegmentsByRoom(
    input.occupancy,
    input.layerFilter,
    input.effectiveToday
  );
  const focusIso = deriveGanttFocusIso(
    input.dayIsos,
    input.effectiveToday,
    input.filter,
    input.focusDay
  );
  const occupiedRoomIdsOnFocus = deriveOccupiedRoomIdsOnFocus(
    focusIso,
    bookingsByRoom,
    occupancyByRoom
  );
  const filteredRooms = deriveFilteredRooms(
    input.rooms,
    input.filter,
    occupiedRoomIdsOnFocus
  );
  const dailyFreeCounts = computeDailyFreeCounts(
    input.rooms,
    activeBookings,
    input.occupancy,
    input.dayIsos
  );
  const todaySummary = summarizeGanttToday(
    activeBookings,
    input.dayIsos,
    input.effectiveToday
  );
  const operativeCheckInEligible = filterBookingsForOperativeCheckIn(
    activeBookings,
    input.effectiveToday
  );
  const todayFlagsByRoom = deriveTodayFlagsByRoom(
    input.rooms,
    bookingsByRoom,
    todaySummary.todayIso
  );
  const buildingGroups = deriveBuildingGroups(
    filteredRooms,
    input.groupByBuilding,
    input.buildingFallbackLabel,
    input.buildings ?? []
  );

  return {
    activeBookings,
    bookingsByRoom,
    occupancyByRoom,
    displaySegmentsByRoom,
    focusIso,
    occupiedRoomIdsOnFocus,
    filteredRooms,
    dailyFreeCounts,
    todaySummary,
    operativeCheckInEligible,
    todayFlagsByRoom,
    buildingGroups,
  };
}

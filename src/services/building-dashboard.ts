import { createAdminClient } from "@/lib/supabase/admin";
import { parseViewDate, viewDateLabel } from "@/lib/availability-date";
import {
  addDays,
  firstDayOfMonth,
  lastDayOfMonth,
  nightsBetween,
  stayNightDates,
} from "@/lib/stay-dates";
import { type NightStay, type RoomNightStatus } from "@/domain/availability/room-night-status";
import type { Building } from "@/types/database";
import { listBuildings } from "@/services/buildings";
import { listFloorsByBuilding } from "@/services/floors";
import { listAllRooms } from "@/services/rooms-admin";

export type BuildingRoomRow = {
  id: string;
  name: string;
  floor_name: string | null;
  is_active: boolean;
  has_ac: boolean;
  capacity_base: number;
  status_on_date: RoomNightStatus;
  guest_on_date: string | null;
};

export type OccupancyWindow = {
  label: string;
  nights: number;
  occupied_room_nights: number;
  total_room_nights: number;
  occupancy_pct: number;
  free_rooms_tonight?: number;
};

export type BuildingDashboard = {
  building: Building;
  view_date: string;
  view_date_label: string;
  free_on_date: number;
  occupied_on_date: number;
  pending_on_date: number;
  floor_count: number;
  room_count: number;
  active_room_count: number;
  on_date: OccupancyWindow;
  week: OccupancyWindow;
  month: OccupancyWindow;
  floors: { id: string; name: string }[];
  rooms: BuildingRoomRow[];
};

async function loadStaysForAvailability(
  rangeStart: string,
  rangeEnd: string
): Promise<NightStay[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_rooms")
    .select(
      `
      room_id,
      bookings!inner ( check_in, check_out, status, guest_name )
    `
    )
    .neq("bookings.status", "anulata")
    .lte("bookings.check_in", rangeEnd)
    .gt("bookings.check_out", rangeStart);

  if (error) throw new Error(error.message);

  const stays: NightStay[] = [];
  for (const row of data ?? []) {
    const raw = row.bookings as
      | {
          check_in: string;
          check_out: string;
          status: string;
          guest_name: string;
        }
      | {
          check_in: string;
          check_out: string;
          status: string;
          guest_name: string;
        }[]
      | null;
    const b = Array.isArray(raw) ? raw[0] : raw;
    if (
      b &&
      (b.status === "confirmata" || b.status === "cerere_noua")
    ) {
      stays.push({
        room_id: row.room_id,
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status as "confirmata" | "cerere_noua",
        guest_name: b.guest_name,
      });
    }
  }
  return stays;
}

type AvailabilityIndexes = {
  confirmedRoomIdsByNight: Map<string, Set<string>>;
  statusByRoomOnViewDate: Map<string, { status: RoomNightStatus; guest: string | null }>;
};

function buildAvailabilityIndexes(
  stays: NightStay[],
  rangeStart: string,
  rangeEnd: string,
  viewDate: string
): AvailabilityIndexes {
  const confirmedRoomIdsByNight = new Map<string, Set<string>>();
  const statusByRoomOnViewDate = new Map<
    string,
    { status: RoomNightStatus; guest: string | null }
  >();
  const rangeEndExclusive = addDays(rangeEnd, 1);

  for (const stay of stays) {
    const start = stay.check_in > rangeStart ? stay.check_in : rangeStart;
    const endExclusive = stay.check_out < rangeEndExclusive ? stay.check_out : rangeEndExclusive;

    if (start >= endExclusive) continue;

    if (viewDate >= stay.check_in && viewDate < stay.check_out) {
      const existing = statusByRoomOnViewDate.get(stay.room_id);
      if (!existing || existing.status !== "occupied") {
        statusByRoomOnViewDate.set(stay.room_id, {
          status: stay.status === "confirmata" ? "occupied" : "pending",
          guest: stay.guest_name,
        });
      }
    }

    if (stay.status !== "confirmata") continue;
    for (const night of stayNightDates(start, endExclusive)) {
      const roomIds = confirmedRoomIdsByNight.get(night) ?? new Set<string>();
      roomIds.add(stay.room_id);
      confirmedRoomIdsByNight.set(night, roomIds);
    }
  }

  return { confirmedRoomIdsByNight, statusByRoomOnViewDate };
}

function countOccupiedRoomNights(
  roomIds: string[],
  nights: string[],
  confirmedRoomIdsByNight: Map<string, Set<string>>
): number {
  if (roomIds.length === 0 || nights.length === 0) return 0;

  const roomIdSet = new Set(roomIds);
  let total = 0;
  for (const night of nights) {
    const occupiedRoomIds = confirmedRoomIdsByNight.get(night);
    if (!occupiedRoomIds) continue;
    for (const roomId of occupiedRoomIds) {
      if (roomIdSet.has(roomId)) {
        total += 1;
      }
    }
  }
  return total;
}

function buildWindow(
  label: string,
  nights: string[],
  activeRoomIds: string[],
  confirmedRoomIdsByNight: Map<string, Set<string>>,
  freeTonight?: number
): OccupancyWindow {
  const total = activeRoomIds.length * nights.length;
  const occupied = countOccupiedRoomNights(
    activeRoomIds,
    nights,
    confirmedRoomIdsByNight
  );
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return {
    label,
    nights: nights.length,
    occupied_room_nights: occupied,
    total_room_nights: total,
    occupancy_pct: pct,
    free_rooms_tonight: freeTonight,
  };
}

export async function listBuildingDashboards(
  viewDateParam?: string
): Promise<BuildingDashboard[]> {
  const viewDate = parseViewDate(viewDateParam);
  const dateLabel = viewDateLabel(viewDate);
  const weekEnd = addDays(viewDate, 6);
  const monthStart = firstDayOfMonth(viewDate);
  const monthEnd = lastDayOfMonth(viewDate);

  const nightsOnDate = [viewDate];
  const nightsWeek = nightsBetween(viewDate, weekEnd);
  const nightsMonth = nightsBetween(monthStart, monthEnd);

  const [buildings, allRooms, stays] = await Promise.all([
    listBuildings(),
    listAllRooms(),
    loadStaysForAvailability(monthStart, monthEnd),
  ]);
  const { confirmedRoomIdsByNight, statusByRoomOnViewDate } = buildAvailabilityIndexes(
    stays,
    monthStart,
    monthEnd,
    viewDate
  );

  return Promise.all(
    buildings.map(async (building) => {
      const floors = await listFloorsByBuilding(building.id);
      const rooms = allRooms.filter((r) => r.building_id === building.id);
      const activeRooms = rooms.filter((r) => r.is_active);
      const activeRoomIds = activeRooms.map((r) => r.id);

      let freeOnDate = 0;
      let occupiedOnDate = 0;
      let pendingOnDate = 0;

      const roomRows: BuildingRoomRow[] = rooms.map((r) => {
        const roomStatus = r.is_active
          ? (statusByRoomOnViewDate.get(r.id) ?? { status: "free", guest: null })
          : { status: "inactive" as const, guest: null };
        const { status, guest } = roomStatus;
        if (r.is_active) {
          if (status === "free") freeOnDate += 1;
          if (status === "occupied") occupiedOnDate += 1;
          if (status === "pending") pendingOnDate += 1;
        }
        return {
          id: r.id,
          name: r.name,
          floor_name: r.floor_name,
          is_active: r.is_active,
          has_ac: r.has_ac,
          capacity_base: r.capacity_base,
          status_on_date: status,
          guest_on_date: guest,
        };
      });

      const onDate = buildWindow(
        dateLabel,
        nightsOnDate,
        activeRoomIds,
        confirmedRoomIdsByNight,
        freeOnDate
      );
      const week = buildWindow(
        "7 zile",
        nightsWeek,
        activeRoomIds,
        confirmedRoomIdsByNight
      );
      const month = buildWindow(
        "current_month",
        nightsMonth,
        activeRoomIds,
        confirmedRoomIdsByNight
      );

      return {
        building,
        view_date: viewDate,
        view_date_label: dateLabel,
        free_on_date: freeOnDate,
        occupied_on_date: occupiedOnDate,
        pending_on_date: pendingOnDate,
        floor_count: floors.length,
        room_count: rooms.length,
        active_room_count: activeRooms.length,
        on_date: onDate,
        week,
        month,
        floors: floors.map((f) => ({ id: f.id, name: f.name })),
        rooms: roomRows,
      };
    })
  );
}

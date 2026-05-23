import { createAdminClient } from "@/lib/supabase/admin";
import { parseViewDate, viewDateLabel } from "@/lib/availability-date";
import {
  roomNightStatus,
  type RoomNightStatus,
} from "@/domain/availability/room-night-status";
import {
  addDays,
  firstDayOfMonth,
  lastDayOfMonth,
  nightOccupied,
  nightsBetween,
  todayIso,
} from "@/lib/stay-dates";
import { listAllRooms } from "@/services/rooms-admin";
import { listBuildings } from "@/services/buildings";
import type { AcMode } from "@/types/database";

export type RoomStayInfo = {
  booking_id: string;
  guest_name: string;
  guest_email: string;
  check_in: string;
  check_out: string;
  status: "confirmata" | "cerere_noua";
  num_adults: number;
  num_children: number;
};

export type RoomDashboard = {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
  building_ac_mode: AcMode;
  building_color: string | null;
  floor_name: string | null;
  capacity_base: number;
  has_ac: boolean;
  price_per_night: number;
  allows_extra_beds: boolean;
  is_active: boolean;
  view_date: string;
  view_date_label: string;
  status_on_date: RoomNightStatus;
  guest_on_date: string | null;
  status_tonight: "free" | "occupied" | "pending" | "inactive";
  current_stay: RoomStayInfo | null;
  next_stay: RoomStayInfo | null;
  week_occupancy_pct: number;
  month_occupancy_pct: number;
};

type StayRow = RoomStayInfo & { room_id: string };

async function loadStaysForRooms(): Promise<StayRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("booking_rooms")
    .select(
      `
      room_id,
      bookings!inner (
        id, guest_name, guest_email, check_in, check_out, status,
        num_adults, num_children
      )
    `
    )
    .neq("bookings.status", "anulata");

  if (error) throw new Error(error.message);

  const rows: StayRow[] = [];
  for (const line of data ?? []) {
    const raw = line.bookings as
      | {
          id: string;
          guest_name: string;
          guest_email: string;
          check_in: string;
          check_out: string;
          status: string;
          num_adults: number;
          num_children: number;
        }
      | {
          id: string;
          guest_name: string;
          guest_email: string;
          check_in: string;
          check_out: string;
          status: string;
          num_adults: number;
          num_children: number;
        }[]
      | null;
    const b = Array.isArray(raw) ? raw[0] : raw;
    if (!b || (b.status !== "confirmata" && b.status !== "cerere_noua")) continue;
    rows.push({
      room_id: line.room_id,
      booking_id: b.id,
      guest_name: b.guest_name,
      guest_email: b.guest_email,
      check_in: b.check_in,
      check_out: b.check_out,
      status: b.status as "confirmata" | "cerere_noua",
      num_adults: b.num_adults,
      num_children: b.num_children,
    });
  }
  return rows;
}

function countNightsOccupied(
  roomId: string,
  nights: string[],
  stays: StayRow[],
  onlyConfirmed: boolean
): number {
  return nights.filter((night) =>
    stays.some(
      (s) =>
        s.room_id === roomId &&
        (!onlyConfirmed || s.status === "confirmata") &&
        nightOccupied(night, s.check_in, s.check_out)
    )
  ).length;
}

function pickCurrentStay(
  roomStays: StayRow[],
  today: string
): RoomStayInfo | null {
  const tonight = roomStays.filter((s) =>
    nightOccupied(today, s.check_in, s.check_out)
  );
  if (tonight.length === 0) return null;
  const confirmed = tonight.find((s) => s.status === "confirmata");
  const pick = confirmed ?? tonight[0];
  const { room_id: _r, ...info } = pick;
  return info;
}

function pickNextStay(
  roomStays: StayRow[],
  today: string,
  current: RoomStayInfo | null
): RoomStayInfo | null {
  const sorted = [...roomStays].sort((a, b) =>
    a.check_in.localeCompare(b.check_in)
  );

  for (const s of sorted) {
    if (current && s.booking_id === current.booking_id) continue;
    if (s.check_out <= today) continue;
    if (!current && nightOccupied(today, s.check_in, s.check_out)) continue;
    if (current && s.check_in < current.check_out) continue;
    const { room_id: _r, ...info } = s;
    return info;
  }
  return null;
}

export async function listRoomDashboards(
  viewDateParam?: string
): Promise<RoomDashboard[]> {
  const viewDate = parseViewDate(viewDateParam);
  const dateLabel = viewDateLabel(viewDate);
  const weekEnd = addDays(viewDate, 6);
  const monthStart = firstDayOfMonth(viewDate);
  const monthEnd = lastDayOfMonth(viewDate);
  const nightsWeek = nightsBetween(viewDate, weekEnd);
  const nightsMonth = nightsBetween(monthStart, monthEnd);

  const [rooms, buildings, stays] = await Promise.all([
    listAllRooms(),
    listBuildings(),
    loadStaysForRooms(),
  ]);

  const buildingById = new Map(buildings.map((b) => [b.id, b]));

  return rooms.map((room) => {
    const building = buildingById.get(room.building_id);
    const roomStays = stays.filter((s) => s.room_id === room.id);
    const { status: statusOnDate, guest: guestOnDate } = roomNightStatus(
      room.is_active,
      room.id,
      viewDate,
      roomStays
    );

    const current = room.is_active
      ? pickCurrentStay(roomStays, viewDate)
      : null;
    const next = room.is_active
      ? pickNextStay(roomStays, viewDate, current)
      : null;

    let status_tonight: RoomDashboard["status_tonight"] = statusOnDate;

    const weekOcc = countNightsOccupied(room.id, nightsWeek, stays, true);
    const monthOcc = countNightsOccupied(room.id, nightsMonth, stays, true);

    return {
      id: room.id,
      name: room.name,
      building_id: room.building_id,
      building_name: room.building_name,
      building_ac_mode: building?.ac_mode ?? "per_room",
      building_color: building?.color_hex ?? null,
      floor_name: room.floor_name,
      capacity_base: room.capacity_base,
      has_ac: room.has_ac,
      price_per_night: room.price_per_night,
      allows_extra_beds: room.allows_extra_beds,
      is_active: room.is_active,
      view_date: viewDate,
      view_date_label: dateLabel,
      status_on_date: statusOnDate,
      guest_on_date: guestOnDate,
      status_tonight,
      current_stay: current,
      next_stay: next,
      week_occupancy_pct:
        nightsWeek.length > 0
          ? Math.round((weekOcc / nightsWeek.length) * 100)
          : 0,
      month_occupancy_pct:
        nightsMonth.length > 0
          ? Math.round((monthOcc / nightsMonth.length) * 100)
          : 0,
    };
  });
}

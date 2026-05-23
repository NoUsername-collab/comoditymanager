import { nightOccupied } from "@/lib/stay-dates";
import { dayInitialFromIso, daysInMonth, monthYearLabelRo } from "@/lib/ro-calendar";
import { listOccupiedRoomRanges, listBookingsForRange } from "@/services/bookings";
import { listAllRooms } from "@/services/rooms-admin";
import { listBuildings } from "@/services/buildings";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeDayAvailability,
  filterRoomsByBuilding,
  type ComputedDay,
  type OccupiedRange,
} from "@/domain/availability/compute";
import type { AvailabilityPressure } from "@/domain/availability/heat";
import {
  findNextWeekendWithRooms,
  scanWeekendsInDays,
  type WeekendPick,
} from "@/domain/availability/weekend-finder";
import { addDays, todayIso } from "@/lib/stay-dates";
import type { AcMode } from "@/types/database";
import { resolveGanttBuildingColor } from "@/lib/building-color-palette";

export type DayAvailabilityStatus = "available" | "full";

export type DayAvailability = ComputedDay;

export type MonthAvailabilityGrid = {
  year: number;
  month: number;
  title: string;
  total_rooms: number;
  week_starts_monday: true;
  leading_blanks: number;
  days: DayAvailability[];
};

export type AvailabilityBuildingOption = {
  id: string;
  name: string;
  color_hex: string | null;
  ac_mode: AcMode;
  room_count: number;
  display_color: string;
};

export type MonthAvailabilityKpis = {
  days_relaxed: number;
  days_full: number;
  days_tight: number;
  min_free_rooms: number;
  min_free_day_iso: string | null;
  unassigned_nights: number;
  pending_cereri_nights: number;
  vs_prev_full_delta: number;
};

export type CereriBandDay = {
  iso: string;
  day: number;
  unassigned: number;
  pending: number;
};

export type AvailabilityDashboard = MonthAvailabilityGrid & {
  buildings: AvailabilityBuildingOption[];
  kpis: MonthAvailabilityKpis;
  weekend_picks: WeekendPick[];
  next_weekend: WeekendPick | null;
  cereri_band: CereriBandDay[];
  scan_days: DayAvailability[];
};

export type DayRoomRow = {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
  building_color: string;
  has_ac: boolean;
  status: "free" | "occupied" | "cerere";
  guest_name: string | null;
  booking_id: string | null;
};

export type DayAvailabilityDetail = {
  day: DayAvailability;
  rooms: DayRoomRow[];
  unassigned_cereri: number;
  pending_cereri: number;
};

function monthRange(year: number, month: number) {
  const dim = daysInMonth(year, month);
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
  return { start, end, dim };
}

function mondayFirstOffset(year: number, month: number): number {
  const dow = new Date(year, month, 1).getDay();
  return dow === 0 ? 6 : dow - 1;
}

function buildDayCountsMaps(
  bookings: Awaited<ReturnType<typeof listBookingsForRange>>
) {
  const checkins = new Map<string, number>();
  const checkouts = new Map<string, number>();
  const unassigned = new Map<string, number>();
  const pending = new Map<string, number>();

  for (const b of bookings) {
    if (b.status === "anulata") continue;

    const cin = b.check_in;
    const cout = b.check_out;
    checkins.set(cin, (checkins.get(cin) ?? 0) + 1);
    checkouts.set(cout, (checkouts.get(cout) ?? 0) + 1);

    if (b.status !== "cerere_noua") continue;

    let d = cin;
    while (d < cout) {
      if (b.room_ids.length === 0) {
        unassigned.set(d, (unassigned.get(d) ?? 0) + 1);
      } else {
        pending.set(d, (pending.get(d) ?? 0) + 1);
      }
      d = addDays(d, 1);
    }
  }

  return { checkins, checkouts, unassigned, pending };
}

function buildDaysForMonth(
  year: number,
  month: number,
  rooms: { id: string; building_id: string; is_active: boolean }[],
  occupied: OccupiedRange[],
  countMaps: ReturnType<typeof buildDayCountsMaps>,
  buildingId: string | null
): DayAvailability[] {
  const { dim } = monthRange(year, month);
  const filtered = filterRoomsByBuilding(rooms, buildingId);
  const days: DayAvailability[] = [];

  for (let d = 1; d <= dim; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(
      computeDayAvailability(iso, d, filtered, occupied, {
        checkins: countMaps.checkins.get(iso) ?? 0,
        checkouts: countMaps.checkouts.get(iso) ?? 0,
        unassigned_cereri: countMaps.unassigned.get(iso) ?? 0,
        pending_cereri: countMaps.pending.get(iso) ?? 0,
      })
    );
  }
  return days;
}

function computeKpis(
  days: DayAvailability[],
  prevFullDays: number
): MonthAvailabilityKpis {
  let days_relaxed = 0;
  let days_full = 0;
  let days_tight = 0;
  let min_free = Infinity;
  let min_iso: string | null = null;
  let unassigned_nights = 0;
  let pending_cereri_nights = 0;

  for (const d of days) {
    if (d.free_rooms >= 3) days_relaxed += 1;
    if (d.status === "full") days_full += 1;
    if (d.pressure === "tight") days_tight += 1;
    if (d.free_rooms < min_free) {
      min_free = d.free_rooms;
      min_iso = d.iso;
    }
    unassigned_nights += d.unassigned_cereri;
    pending_cereri_nights += d.pending_cereri;
  }

  return {
    days_relaxed,
    days_full,
    days_tight,
    min_free_rooms: min_free === Infinity ? 0 : min_free,
    min_free_day_iso: min_iso,
    unassigned_nights,
    pending_cereri_nights,
    vs_prev_full_delta: days_full - prevFullDays,
  };
}

export async function loadMonthAvailabilityGrid(
  year: number,
  month: number,
  buildingId: string | null = null
): Promise<MonthAvailabilityGrid> {
  const dash = await loadAvailabilityDashboard(year, month, buildingId);
  return dash;
}

export async function loadAvailabilityDashboard(
  year: number,
  month: number,
  buildingId: string | null = null
): Promise<AvailabilityDashboard> {
  const { start, end, dim } = monthRange(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  const scanEnd = addDays(end, 75);
  const scanStart = todayIso();
  const rangeStart = scanStart < start ? scanStart : start;

  const [roomsRaw, buildings, occupied, bookings] = await Promise.all([
    listAllRooms(),
    listBuildings(),
    listOccupiedRoomRanges(),
    listBookingsForRange(rangeStart, scanEnd),
  ]);

  const rooms = roomsRaw.map((r) => ({
    id: r.id,
    building_id: r.building_id,
    is_active: r.is_active,
  }));

  const countMaps = buildDayCountsMaps(bookings);

  const days = buildDaysForMonth(year, month, rooms, occupied, countMaps, buildingId);
  const prevDays = buildDaysForMonth(
    prevYear,
    prevMonth,
    rooms,
    occupied,
    countMaps,
    buildingId
  );
  const prevFull = prevDays.filter((d) => d.status === "full").length;

  const mergedScan: DayAvailability[] = [];
  const seenScan = new Set<string>();
  for (let offset = 0; offset <= 4; offset += 1) {
    let mm = month + offset;
    let yy = year;
    while (mm > 11) {
      mm -= 12;
      yy += 1;
    }
    const built = buildDaysForMonth(yy, mm, rooms, occupied, countMaps, buildingId);
    for (const d of built) {
      if (d.iso >= scanStart && d.iso <= scanEnd && !seenScan.has(d.iso)) {
        seenScan.add(d.iso);
        mergedScan.push(d);
      }
    }
  }
  mergedScan.sort((a, b) => a.iso.localeCompare(b.iso));

  const buildingOptions: AvailabilityBuildingOption[] = buildings
    .filter((b) => b.is_active)
    .map((b) => {
      const rc = rooms.filter((r) => r.building_id === b.id && r.is_active).length;
      return {
        id: b.id,
        name: b.name,
        color_hex: b.color_hex,
        ac_mode: b.ac_mode,
        room_count: rc,
        display_color: resolveGanttBuildingColor(b.color_hex, b.ac_mode),
      };
    })
    .filter((b) => b.room_count > 0);

  const activeTotal = filterRoomsByBuilding(rooms, buildingId).length;

  const kpis = computeKpis(days, prevFull);
  const weekend_picks = scanWeekendsInDays(mergedScan, 2).slice(0, 4);
  const next_weekend = findNextWeekendWithRooms(mergedScan, todayIso(), 2);

  const cereri_band: CereriBandDay[] = days.map((d) => ({
    iso: d.iso,
    day: d.day,
    unassigned: d.unassigned_cereri,
    pending: d.pending_cereri,
  }));

  return {
    year,
    month,
    title: monthYearLabelRo(year, month),
    total_rooms: activeTotal,
    week_starts_monday: true,
    leading_blanks: mondayFirstOffset(year, month),
    days,
    buildings: buildingOptions,
    kpis,
    weekend_picks,
    next_weekend,
    cereri_band,
    scan_days: mergedScan,
  };
}

export async function loadDayAvailabilityDetail(
  iso: string,
  buildingId: string | null = null
): Promise<DayAvailabilityDetail | null> {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || m < 1 || m > 12 || !d) return null;

  const grid = await loadAvailabilityDashboard(y, m - 1, buildingId);
  const day = grid.days.find((x) => x.iso === iso);
  if (!day) return null;

  const roomsRaw = await listAllRooms();
  const buildings = await listBuildings();
  const buildingMap = new Map(buildings.map((b) => [b.id, b]));
  const activeRooms = roomsRaw.filter(
    (r) =>
      r.is_active &&
      (!buildingId || r.building_id === buildingId)
  );

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_rooms")
    .select(
      `room_id, booking_id,
      bookings!inner ( id, check_in, check_out, status, guest_name, guest_last_name, guest_first_name )`
    )
    .neq("bookings.status", "anulata");

  const roomState = new Map<
    string,
    { guest_name: string; booking_id: string; status: "occupied" | "cerere" }
  >();

  for (const row of data ?? []) {
    const raw = row.bookings as
      | {
          id: string;
          check_in: string;
          check_out: string;
          status: string;
          guest_name: string;
          guest_last_name: string | null;
          guest_first_name: string | null;
        }
      | {
          id: string;
          check_in: string;
          check_out: string;
          status: string;
          guest_name: string;
          guest_last_name: string | null;
          guest_first_name: string | null;
        }[]
      | null;
    const b = Array.isArray(raw) ? raw[0] : raw;
    if (!b || !nightOccupied(iso, b.check_in, b.check_out)) continue;
    const st = b.status === "cerere_noua" ? "cerere" : "occupied";
    roomState.set(row.room_id, {
      guest_name: b.guest_name,
      booking_id: b.id,
      status: st,
    });
  }

  const rooms: DayRoomRow[] = activeRooms.map((r) => {
    const b = buildingMap.get(r.building_id);
    const st = roomState.get(r.id);
    const color = resolveGanttBuildingColor(
      b?.color_hex ?? null,
      b?.ac_mode ?? "per_room"
    );
    return {
      id: r.id,
      name: r.name,
      building_id: r.building_id,
      building_name: r.building_name,
      building_color: color,
      has_ac: r.has_ac,
      status: st?.status ?? "free",
      guest_name: st?.guest_name ?? null,
      booking_id: st?.booking_id ?? null,
    };
  });

  rooms.sort((a, b) => {
    const order = { free: 0, cerere: 1, occupied: 2 };
    if (a.status !== b.status) return order[a.status] - order[b.status];
    return a.name.localeCompare(b.name);
  });

  const { data: cereri } = await supabase
    .from("bookings")
    .select("id, check_in, check_out, booking_rooms ( room_id )")
    .eq("status", "cerere_noua")
    .lte("check_in", iso)
    .gt("check_out", iso);

  let unassigned = 0;
  let pending = 0;
  for (const c of cereri ?? []) {
    const br = (c.booking_rooms ?? []) as { room_id: string }[];
    if (br.length === 0) unassigned += 1;
    else pending += 1;
  }

  return {
    day,
    rooms,
    unassigned_cereri: unassigned,
    pending_cereri: pending,
  };
}

export type { AvailabilityPressure, WeekendPick };

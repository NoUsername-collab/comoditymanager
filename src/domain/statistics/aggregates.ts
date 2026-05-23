import {
  calendarNightsInYear,
  daysInGregorianYear,
  monthBounds,
  nightOccupied,
  nightsBetween,
  stayNightDates,
  yearBounds,
} from "@/lib/stay-dates";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import type {
  BuildingYearStatistics,
  MonthIndex,
  MonthStatistics,
  YearStatistics,
} from "./types";

const MONTH_LABELS = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type StatBooking = {
  id: string;
  check_in: string;
  check_out: string;
  status: "cerere_noua" | "confirmata" | "anulata";
  num_adults: number;
  num_children: number;
  total_price: number | null;
  created_at: string;
  confirmed_at: string | null;
  room_ids: string[];
  building_ids: string[];
  /** Preț/noapte per cameră — fallback venit când total_price lipsește */
  room_prices: number[];
};

export function resolvedBookingRevenue(b: StatBooking): number | null {
  if (b.status !== "confirmata") return null;
  if (b.total_price != null && b.total_price > 0) return Number(b.total_price);
  if (!b.room_prices.length) return null;
  const total = computeStandardStayTotal(
    b.room_prices.map((price_per_night) => ({ price_per_night })),
    b.check_in,
    b.check_out
  );
  return total > 0 ? total : null;
}

export type ActiveRoomSnapshot = {
  id: string;
  building_id: string;
  building_name: string;
};

export function countOccupiedRoomNights(
  roomIds: string[],
  nights: string[],
  bookings: StatBooking[],
  onlyConfirmed: boolean
): number {
  if (!roomIds.length || !nights.length) return 0;
  let total = 0;
  for (const night of nights) {
    for (const roomId of roomIds) {
      if (
        bookings.some(
          (b) =>
            b.room_ids.includes(roomId) &&
            (!onlyConfirmed || b.status === "confirmata") &&
            nightOccupied(night, b.check_in, b.check_out)
        )
      ) {
        total += 1;
      }
    }
  }
  return total;
}

function bookingTouchesYear(b: StatBooking, year: number): boolean {
  const { start, end } = yearBounds(year);
  return b.check_in <= end && b.check_out > start;
}

function bookingCreatedInYear(b: StatBooking, year: number): boolean {
  return b.created_at.slice(0, 4) === String(year);
}

function sumRevenueUnique(bookings: StatBooking[]): {
  total: number;
  complete: boolean;
} {
  const seen = new Set<string>();
  let total = 0;
  let complete = true;
  for (const b of bookings) {
    if (b.status !== "confirmata" || seen.has(b.id)) continue;
    seen.add(b.id);
    if (b.total_price == null) {
      const resolved = resolvedBookingRevenue(b);
      if (resolved == null) complete = false;
      else total += resolved;
    } else total += Number(b.total_price);
  }
  return { total, complete };
}

export function buildYearStatistics(
  year: number,
  bookings: StatBooking[],
  rooms: ActiveRoomSnapshot[]
): YearStatistics {
  const activeRoomIds = rooms.map((r) => r.id);
  const yearNights = calendarNightsInYear(year);
  const capacity = activeRoomIds.length * daysInGregorianYear(year);

  const confirmed = bookings.filter(
    (b) => b.status === "confirmata" && bookingTouchesYear(b, year)
  );

  let guestNights = 0;
  let adults = 0;
  let children = 0;
  for (const b of confirmed) {
    guestNights += stayNightDates(b.check_in, b.check_out).filter((n) =>
      n.startsWith(String(year))
    ).length;
    adults += b.num_adults;
    children += b.num_children;
  }

  const roomNightsOccupied = countOccupiedRoomNights(
    activeRoomIds,
    yearNights,
    bookings,
    true
  );

  const { total: revenueRon, complete: revenueComplete } =
    sumRevenueUnique(confirmed);

  const buildingMap = new Map<string, BuildingYearStatistics>();
  for (const r of rooms) {
    if (!buildingMap.has(r.building_id)) {
      buildingMap.set(r.building_id, {
        buildingId: r.building_id,
        buildingName: r.building_name,
        activeRooms: 0,
        confirmedStays: 0,
        guestNights: 0,
        roomNightsOccupied: 0,
        roomNightsCapacity: daysInGregorianYear(year),
        occupancyPct: 0,
        revenueRon: 0,
      });
    }
    buildingMap.get(r.building_id)!.activeRooms += 1;
    buildingMap.get(r.building_id)!.roomNightsCapacity =
      buildingMap.get(r.building_id)!.activeRooms * daysInGregorianYear(year);
  }

  for (const b of confirmed) {
    const buildingSet = new Set(b.building_ids);
    const nightsInY = stayNightDates(b.check_in, b.check_out).filter((n) =>
      n.startsWith(String(year))
    ).length;
    for (const bid of buildingSet) {
      const row = buildingMap.get(bid);
      if (!row) continue;
      row.confirmedStays += 1;
      row.guestNights += nightsInY;
      if (b.total_price != null && buildingSet.size > 0) {
        row.revenueRon += Number(b.total_price) / buildingSet.size;
      } else {
        const resolved = resolvedBookingRevenue(b);
        if (resolved != null && buildingSet.size > 0) {
          row.revenueRon += resolved / buildingSet.size;
        }
      }
    }
  }

  for (const [bid, row] of buildingMap) {
    const bRoomIds = rooms.filter((r) => r.building_id === bid).map((r) => r.id);
    row.roomNightsOccupied = countOccupiedRoomNights(
      bRoomIds,
      yearNights,
      bookings,
      true
    );
    row.occupancyPct =
      row.roomNightsCapacity > 0
        ? Math.round((row.roomNightsOccupied / row.roomNightsCapacity) * 100)
        : 0;
  }

  const months: MonthStatistics[] = [];
  for (let m = 0; m < 12; m++) {
    const { start, end } = monthBounds(year, m);
    const monthNights = nightsBetween(start, end);
    const monthConfirmed = confirmed.filter(
      (b) => b.check_in <= end && b.check_out > start
    );
    let monthGuestNights = 0;
    for (const b of monthConfirmed) {
      monthGuestNights += stayNightDates(b.check_in, b.check_out).filter(
        (n) => n >= start && n <= end
      ).length;
    }
    const monthCapacity = activeRoomIds.length * monthNights.length;
    const monthOccupied = countOccupiedRoomNights(
      activeRoomIds,
      monthNights,
      bookings,
      true
    );
    months.push({
      month: m as MonthIndex,
      label: MONTH_LABELS[m],
      confirmedStays: new Set(monthConfirmed.map((b) => b.id)).size,
      guestNights: monthGuestNights,
      roomNightsOccupied: monthOccupied,
      roomNightsCapacity: monthCapacity,
      occupancyPct:
        monthCapacity > 0
          ? Math.round((monthOccupied / monthCapacity) * 100)
          : 0,
      revenueRon: sumRevenueUnique(monthConfirmed).total,
    });
  }

  return {
    year,
    confirmedStays: new Set(confirmed.map((b) => b.id)).size,
    cereriCreated: bookings.filter((b) => bookingCreatedInYear(b, year)).length,
    cancelledStays: bookings.filter(
      (b) => b.status === "anulata" && bookingTouchesYear(b, year)
    ).length,
    guestNights,
    roomNightsOccupied,
    roomNightsCapacity: capacity,
    occupancyPct:
      capacity > 0 ? Math.round((roomNightsOccupied / capacity) * 100) : 0,
    revenueRon,
    revenueComplete,
    adults,
    children,
    months,
    buildings: [...buildingMap.values()].sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName)
    ),
  };
}

export function discoverYears(
  bookings: StatBooking[],
  currentYear: number
): number[] {
  const set = new Set<number>([currentYear]);
  for (const b of bookings) {
    set.add(Number(b.check_in.slice(0, 4)));
    set.add(Number(b.check_out.slice(0, 4)));
    set.add(Number(b.created_at.slice(0, 4)));
  }
  return [...set].sort((a, b) => a - b);
}

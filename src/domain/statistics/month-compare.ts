import {
  countOccupiedRoomNights,
  resolvedBookingRevenue,
  type ActiveRoomSnapshot,
  type StatBooking,
} from "@/domain/statistics/aggregates";
import { computeRevenueKpis } from "@/domain/statistics/kpi-metrics";
import { monthBounds, nightsBetween, todayIso } from "@/lib/stay-dates";

export type MonthCompareSnapshot = {
  year: number;
  month: number;
  monthLabel: string;
  occupiedRoomNights: number;
  capacityRoomNights: number;
  activeRooms: number;
  daysInMonth: number;
  occupancyPct: number;
  confirmedStays: number;
  revenueRon: number;
  revenueComplete: boolean;
  adrRon: number | null;
  revparRon: number | null;
};

export type MonthComparison = {
  current: MonthCompareSnapshot;
  previousYear: MonthCompareSnapshot | null;
  occupancyDeltaPct: number | null;
  revenueDeltaPct: number | null;
};

const MONTH_NAMES = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

function snapshotForMonth(
  year: number,
  month: number,
  bookings: StatBooking[],
  rooms: ActiveRoomSnapshot[]
): MonthCompareSnapshot {
  const { start, end } = monthBounds(year, month);
  const nights = nightsBetween(start, end);
  const roomIds = rooms.map((r) => r.id);
  const capacityRoomNights = roomIds.length * nights.length;
  const occupiedRoomNights = countOccupiedRoomNights(
    roomIds,
    nights,
    bookings,
    true
  );
  const occupancyPct =
    capacityRoomNights > 0
      ? Math.round((occupiedRoomNights / capacityRoomNights) * 100)
      : 0;

  const monthStart = nights[0];
  const monthEnd = nights[nights.length - 1];
  const inMonth = bookings.filter(
    (b) =>
      b.status === "confirmata" &&
      b.check_in <= monthEnd &&
      b.check_out > monthStart
  );
  const confirmedStays = inMonth.length;

  let revenueRon = 0;
  let revenueComplete = true;
  const seen = new Set<string>();
  for (const b of inMonth) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    const resolved = resolvedBookingRevenue(b);
    if (resolved == null) revenueComplete = false;
    else revenueRon += resolved;
  }

  const roundedRevenue = Math.round(revenueRon * 100) / 100;

  return {
    year,
    month,
    monthLabel: MONTH_NAMES[month],
    occupiedRoomNights,
    capacityRoomNights,
    activeRooms: roomIds.length,
    daysInMonth: nights.length,
    occupancyPct,
    confirmedStays,
    revenueRon: roundedRevenue,
    revenueComplete,
    ...computeRevenueKpis({
      revenueRon: roundedRevenue,
      roomNightsOccupied: occupiedRoomNights,
      roomNightsCapacity: capacityRoomNights,
    }),
  };
}

export function buildMonthComparison(
  bookings: StatBooking[],
  rooms: ActiveRoomSnapshot[],
  refIso: string = todayIso()
): MonthComparison {
  const y = Number(refIso.slice(0, 4));
  const m = Number(refIso.slice(5, 7)) - 1;
  const current = snapshotForMonth(y, m, bookings, rooms);
  const prevYear = y - 1;
  const hasPrev = bookings.some(
    (b) =>
      b.status === "confirmata" &&
      (b.check_in.startsWith(String(prevYear)) ||
        b.confirmed_at?.startsWith(String(prevYear)))
  );
  const previousYear = hasPrev
    ? snapshotForMonth(prevYear, m, bookings, rooms)
    : null;

  const occupancyDeltaPct =
    previousYear && previousYear.occupancyPct > 0
      ? current.occupancyPct - previousYear.occupancyPct
      : previousYear
        ? current.occupancyPct - previousYear.occupancyPct
        : null;

  let revenueDeltaPct: number | null = null;
  if (
    previousYear &&
    previousYear.revenueComplete &&
    current.revenueComplete &&
    previousYear.revenueRon > 0
  ) {
    revenueDeltaPct = Math.round(
      ((current.revenueRon - previousYear.revenueRon) / previousYear.revenueRon) *
        100
    );
  }

  return {
    current,
    previousYear,
    occupancyDeltaPct,
    revenueDeltaPct,
  };
}

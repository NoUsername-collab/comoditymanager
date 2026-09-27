import { bookingBarInRange } from "@/domain/gantt/bar-position";
import { addDays } from "@/lib/stay-dates";

/** Index of day column from pointer X within row width. */
export function dayIndexFromPointerX(
  clientX: number,
  rowLeft: number,
  rowWidth: number,
  dayCount: number
): number {
  if (dayCount <= 0 || rowWidth <= 0) return 0;
  const x = Math.max(0, Math.min(rowWidth, clientX - rowLeft));
  const ratio = x / rowWidth;
  return Math.max(0, Math.min(dayCount - 1, Math.floor(ratio * dayCount)));
}

export function intervalFromDayIndices(
  dayIsos: string[],
  startIdx: number,
  endIdx: number
): { checkIn: string; checkOut: string } | null {
  if (dayIsos.length === 0) return null;
  const start = Math.max(0, Math.min(startIdx, dayIsos.length - 1));
  const end = Math.max(start, Math.min(endIdx, dayIsos.length - 1));
  const checkIn = dayIsos[start];
  const checkOut = addDays(dayIsos[end], 1);
  return { checkIn, checkOut };
}

/** Ghost / pin bar: same clock as stay chips (check-in time → check-out time). */
export function ghostBarPosition(input: {
  checkIn: string;
  checkOut: string;
  rangeStart: string;
  rangeEnd: string;
  dayCount: number;
  checkInTime: string;
  checkOutTime: string;
}): { leftPct: number; widthPct: number } | null {
  const pos = bookingBarInRange(
    input.checkIn,
    input.checkOut,
    input.rangeStart,
    input.rangeEnd,
    input.dayCount,
    input.checkInTime,
    input.checkOutTime
  );
  if (!pos) return null;
  return { leftPct: pos.leftPct, widthPct: pos.widthPct };
}

export function ghostBarFromDayIndices(
  dayIsos: string[],
  startIdx: number,
  endIdx: number,
  rangeStart: string,
  rangeEnd: string,
  checkInTime: string,
  checkOutTime: string
): { leftPct: number; widthPct: number } | null {
  const interval = intervalFromDayIndices(dayIsos, startIdx, endIdx);
  if (!interval) return null;
  return ghostBarPosition({
    checkIn: interval.checkIn,
    checkOut: interval.checkOut,
    rangeStart,
    rangeEnd,
    dayCount: dayIsos.length,
    checkInTime,
    checkOutTime,
  });
}

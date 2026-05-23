import { addDays, nightOccupied } from "@/lib/stay-dates";

export type GanttBarPosition = {
  leftPct: number;
  widthPct: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/** Poziționare pe grilă CSS (1 coloană = 1 zi / noapte). */
export type GanttBarGridSpan = {
  columnStart: number;
  columnSpan: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

function nightSpanIndices(
  checkIn: string,
  checkOut: string,
  visibleDayIsos: string[]
): GanttBarGridSpan | null {
  const dayCount = visibleDayIsos.length;
  if (dayCount === 0) return null;

  const firstDay = visibleDayIsos[0];
  const lastDay = visibleDayIsos[dayCount - 1];
  const rangeEndExclusive = addDays(lastDay, 1);

  if (checkOut <= firstDay || checkIn >= rangeEndExclusive) return null;

  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < dayCount; i++) {
    if (nightOccupied(visibleDayIsos[i], checkIn, checkOut)) {
      if (firstIdx < 0) firstIdx = i;
      lastIdx = i;
    }
  }
  if (firstIdx < 0) return null;

  return {
    columnStart: firstIdx + 1,
    columnSpan: lastIdx - firstIdx + 1,
    continuesBefore: checkIn < firstDay,
    continuesAfter: checkOut > rangeEndExclusive,
  };
}

export function bookingBarGridSpan(
  checkIn: string,
  checkOut: string,
  visibleDayIsos: string[]
): GanttBarGridSpan | null {
  return nightSpanIndices(checkIn, checkOut, visibleDayIsos);
}

export function gridSpanToPosition(
  span: GanttBarGridSpan,
  dayCount: number
): GanttBarPosition {
  const leftPct = ((span.columnStart - 1) / dayCount) * 100;
  const widthPct = (span.columnSpan / dayCount) * 100;
  return {
    leftPct,
    widthPct,
    continuesBefore: span.continuesBefore,
    continuesAfter: span.continuesAfter,
  };
}

function parseStayDateTime(dateIso: string, time: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh ?? 0, mm ?? 0, 0, 0);
}

function parseRangeEndExclusive(rangeEndIso: string): Date {
  const [y, m, d] = rangeEndIso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Bară Gantt pe un interval de zile [rangeStart, rangeEnd).
 * rangeEnd = prima zi DUPĂ ultima coloană (exclusiv).
 */
export function bookingBarInRange(
  checkIn: string,
  checkOut: string,
  rangeStart: string,
  rangeEnd: string,
  dayCount: number,
  checkInTime: string,
  checkOutTime: string
): GanttBarPosition | null {
  if (dayCount <= 0) return null;

  const viewStart = parseStayDateTime(rangeStart, "00:00");
  const viewEnd = parseRangeEndExclusive(rangeEnd);

  const stayStart = parseStayDateTime(checkIn, checkInTime);
  const stayEnd = parseStayDateTime(checkOut, checkOutTime);

  if (stayEnd <= viewStart || stayStart >= viewEnd) return null;

  const continuesBefore = stayStart < viewStart;
  const continuesAfter = stayEnd > viewEnd;

  const spanMs = viewEnd.getTime() - viewStart.getTime();
  if (spanMs <= 0) return null;

  const clipStart = continuesBefore ? viewStart : stayStart;
  const clipEnd = continuesAfter ? viewEnd : stayEnd;

  const leftPct =
    ((clipStart.getTime() - viewStart.getTime()) / spanMs) * 100;
  let widthPct =
    ((clipEnd.getTime() - clipStart.getTime()) / spanMs) * 100;

  widthPct = Math.min(widthPct, 100 - leftPct);
  if (widthPct <= 0) return null;

  return {
    leftPct,
    widthPct,
    continuesBefore,
    continuesAfter,
  };
}

/** @deprecated Prefer bookingBarGridSpan + grid CSS în Gantt */
export function bookingBarInRangeByNights(
  checkIn: string,
  checkOut: string,
  visibleDayIsos: string[]
): GanttBarPosition | null {
  const span = nightSpanIndices(checkIn, checkOut, visibleDayIsos);
  if (!span || visibleDayIsos.length === 0) return null;
  return gridSpanToPosition(span, visibleDayIsos.length);
}

/** @deprecated Folosește bookingBarInRange — păstrat pentru compatibilitate */
export function bookingBarInMonth(
  checkIn: string,
  checkOut: string,
  year: number,
  month: number,
  daysInMonth: number,
  checkInTime: string,
  checkOutTime: string
): GanttBarPosition | null {
  const rangeStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const rangeEnd =
    month === 11
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 2).padStart(2, "0")}-01`;
  return bookingBarInRange(
    checkIn,
    checkOut,
    rangeStart,
    rangeEnd,
    daysInMonth,
    checkInTime,
    checkOutTime
  );
}

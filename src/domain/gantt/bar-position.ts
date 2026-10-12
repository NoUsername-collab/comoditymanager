
export type GanttBarPosition = {
  leftPct: number;
  widthPct: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

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
 * Gantt bar on a day range [rangeStart, rangeEnd).
 * rangeEnd is the first day after the last column (exclusive).
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

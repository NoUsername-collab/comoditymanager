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

export function ghostBarPosition(
  startIdx: number,
  endIdx: number,
  dayCount: number
): { leftPct: number; widthPct: number } {
  const start = Math.min(startIdx, endIdx);
  const end = Math.max(startIdx, endIdx);
  const span = end - start + 1;
  return {
    leftPct: (start / dayCount) * 100,
    widthPct: (span / dayCount) * 100,
  };
}

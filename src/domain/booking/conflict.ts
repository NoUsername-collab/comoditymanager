import { DEFAULT_CHECK_IN_TIME, DEFAULT_CHECK_OUT_TIME } from "@/lib/constants";

/**
 * Interval ocupat pe o cameră: [check-in 14:00, check-out 11:00)
 * Spec: turnover aceeași zi OK; NICIODATA suprapunere intervale.
 */
export function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function rangesOverlap(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
  checkInTime = DEFAULT_CHECK_IN_TIME,
  checkOutTime = DEFAULT_CHECK_OUT_TIME
): boolean {
  const aStart = toDateTime(a.checkIn, checkInTime);
  const aEnd = toDateTime(a.checkOut, checkOutTime);
  const bStart = toDateTime(b.checkIn, checkInTime);
  const bEnd = toDateTime(b.checkOut, checkOutTime);

  return bStart < aEnd && bEnd > aStart;
}

/** Minim o noapte: check-out strict după check-in (ca date) */
export function isAtLeastOneNight(checkIn: string, checkOut: string): boolean {
  return checkOut > checkIn;
}

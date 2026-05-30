import { parseIso, formatIso, todayIso } from "@/lib/stay-dates";

export function shiftStayDatesByYears(
  checkIn: string,
  checkOut: string,
  years: number
): { check_in: string; check_out: string } {
  const inDate = parseIso(checkIn);
  const outDate = parseIso(checkOut);
  inDate.setFullYear(inDate.getFullYear() + years);
  outDate.setFullYear(outDate.getFullYear() + years);
  return {
    check_in: formatIso(inDate),
    check_out: formatIso(outDate),
  };
}

/**
 * Shift a past stay forward by the minimum number of whole years so that
 * check-in lands on or after today.  If the stay is already in the future,
 * the dates are returned unchanged.
 */
export function shiftStayToNextFutureYear(
  checkIn: string,
  checkOut: string,
): { check_in: string; check_out: string } {
  const today = todayIso();
  if (checkIn >= today) {
    return { check_in: checkIn, check_out: checkOut };
  }
  const inDate = parseIso(checkIn);
  const todayDate = parseIso(today);
  let yearsToShift = todayDate.getFullYear() - inDate.getFullYear();
  // After shifting, check-in might still be in the past if the month/day
  // hasn't been reached yet this year — bump by one more year in that case.
  const candidate = parseIso(checkIn);
  candidate.setFullYear(candidate.getFullYear() + yearsToShift);
  if (formatIso(candidate) < today) {
    yearsToShift += 1;
  }
  return shiftStayDatesByYears(checkIn, checkOut, yearsToShift);
}

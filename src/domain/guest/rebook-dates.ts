import { parseIso, formatIso } from "@/lib/stay-dates";

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

import { addDays, formatIso, parseIso } from "@/lib/stay-dates";

export function startOfWeekIso(iso: string): string {
  const d = parseIso(iso);
  const day = d.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + shift);
  return formatIso(d);
}

export function endOfWeekIso(iso: string): string {
  return addDays(startOfWeekIso(iso), 6);
}

export function startOfMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setDate(1);
  return formatIso(d);
}

export function endOfMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return formatIso(d);
}

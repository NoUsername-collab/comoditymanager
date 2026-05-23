/**
 * Calendar Gregorian (Date local) — an bisect, luni cu 28–31 zile.
 * ISO YYYY-MM-DD întotdeauna parsat local, fără shift UTC.
 */

/** Duminică=0 … Sâmbătă=6 — 3 litere, prima majusculă */
const WEEKDAY_SHORT = [
  "Dum",
  "Lun",
  "Mar",
  "Mie",
  "Joi",
  "Vin",
  "Sam",
] as const;

const MONTH_SHORT = [
  "ian",
  "feb",
  "mar",
  "apr",
  "mai",
  "iun",
  "iul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

export function parseDateIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** Zile în lună (0-indexed month), inclusiv februarie în an bisect */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function dayInitialFromDate(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

export function dayInitialFromIso(iso: string): string {
  return dayInitialFromDate(parseDateIsoLocal(iso));
}

export function dayInitialInMonth(
  year: number,
  month: number,
  day: number
): string {
  return dayInitialFromDate(new Date(year, month, day));
}

/** Header Gantt: „Lun 4” */
export function formatGanttDayLabel(
  year: number,
  month: number,
  day: number
): { weekday: string; day: number } {
  return {
    weekday: dayInitialInMonth(year, month, day),
    day,
  };
}

/** ex. „22 mai · Joi” */
export function formatDateWithDay(iso: string, showYear = false): string {
  const d = parseDateIsoLocal(iso);
  const initial = dayInitialFromDate(d);
  const month = MONTH_SHORT[d.getMonth()];
  const base = showYear
    ? `${d.getDate()} ${month} ${d.getFullYear()}`
    : `${d.getDate()} ${month}`;
  return `${base} · ${initial}`;
}

/** ex. „22 mai · Joi → 3 iun · Vin” */
export function formatStayPeriod(
  checkIn: string,
  checkOut: string,
  showYear = false
): string {
  return `${formatDateWithDay(checkIn, showYear)} → ${formatDateWithDay(checkOut, showYear)}`;
}

export function monthYearLabelRo(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("ro-RO", {
    month: "long",
    year: "numeric",
  });
}

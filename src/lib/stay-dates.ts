export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return formatIso(d);
}

export function lastDayOfMonth(iso: string): string {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + 1, 0);
  return formatIso(d);
}

export function firstDayOfMonth(iso: string): string {
  const d = parseIso(iso);
  d.setDate(1);
  return formatIso(d);
}

export function nightsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function nightOccupied(
  date: string,
  checkIn: string,
  checkOut: string
): boolean {
  return date >= checkIn && date < checkOut;
}

/** Nopțile unui sejur: check_in inclus, check_out exclus */
export function stayNightDates(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn;
  while (cur < checkOut) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function stayNightCount(checkIn: string, checkOut: string): number {
  return stayNightDates(checkIn, checkOut).length;
}

export function yearBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/** Toate nopțile calendaristice dintr-un an (pentru capacitate / ocupare) */
export function calendarNightsInYear(year: number): string[] {
  const { start, end } = yearBounds(year);
  return nightsBetween(start, end);
}

export function isLeapYearGregorian(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInGregorianYear(year: number): number {
  return isLeapYearGregorian(year) ? 366 : 365;
}

export function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = lastDayOfMonth(start);
  return { start, end };
}

import { formatDateWithDay } from "@/lib/ro-calendar";

export function formatRoDate(iso: string): string {
  return formatDateWithDay(iso, true);
}

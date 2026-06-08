import { stayNightDates } from "@/lib/stay-dates";

export type StayNightProgress = {
  total: number;
  current: number;
  pct: number;
};

/** Progres nopți (1-based current) pentru bara Gantt; null dacă sejur invalid. */
export function stayNightProgress(
  checkIn: string,
  checkOut: string,
  today: string
): StayNightProgress | null {
  const nights = stayNightDates(checkIn, checkOut);
  const total = nights.length;
  if (total <= 0) return null;

  if (today < checkIn) {
    return { total, current: 0, pct: 0 };
  }
  if (today >= checkOut) {
    return { total, current: total, pct: 100 };
  }

  const idx = nights.indexOf(today);
  if (idx < 0) {
    return { total, current: total, pct: 100 };
  }

  const current = idx + 1;
  return { total, current, pct: (current / total) * 100 };
}

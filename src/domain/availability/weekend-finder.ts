import { addDays, parseIso } from "@/lib/stay-dates";
import type { DayAvailability } from "@/domain/availability/day";

export type WeekendPick = {
  saturday_iso: string;
  sunday_iso: string;
  min_free_rooms: number;
  label: string;
};

function dayByIso(days: DayAvailability[], iso: string): DayAvailability | undefined {
  return days.find((d) => d.iso === iso);
}

/** Următorul weekend (sâmbătă–duminică) cu ≥ minFree camere în ambele nopți */
export function findNextWeekendWithRooms(
  days: DayAvailability[],
  fromIso: string,
  minFree = 2,
  maxScanDays = 120
): WeekendPick | null {
  let cursor = fromIso;
  for (let i = 0; i < maxScanDays; i += 1) {
    const d = parseIso(cursor);
    const dow = d.getDay();
    if (dow === 6) {
      const sat = cursor;
      const sun = addDays(cursor, 1);
      const satDay = dayByIso(days, sat);
      const sunDay = dayByIso(days, sun);
      if (satDay && sunDay) {
        const minFreeRooms = Math.min(satDay.free_rooms, sunDay.free_rooms);
        if (minFreeRooms >= minFree) {
          return {
            saturday_iso: sat,
            sunday_iso: sun,
            min_free_rooms: minFreeRooms,
            label: `${satDay.day}–${sunDay.day} ${satDay.weekday}/${sunDay.weekday}`,
          };
        }
      }
    }
    cursor = addDays(cursor, 1);
  }
  return null;
}

/** Toate weekendurile din lista de zile (pentru scan în mai multe luni) */
export function scanWeekendsInDays(
  days: DayAvailability[],
  minFree = 2
): WeekendPick[] {
  const out: WeekendPick[] = [];
  const seen = new Set<string>();
  for (const d of days) {
    const date = parseIso(d.iso);
    if (date.getDay() !== 6) continue;
    const sat = d.iso;
    const sun = addDays(sat, 1);
    if (seen.has(sat)) continue;
    const sunDay = dayByIso(days, sun);
    if (!sunDay) continue;
    const minFreeRooms = Math.min(d.free_rooms, sunDay.free_rooms);
    if (minFreeRooms >= minFree) {
      seen.add(sat);
      out.push({
        saturday_iso: sat,
        sunday_iso: sun,
        min_free_rooms: minFreeRooms,
        label: `${d.day}–${sunDay.day}`,
      });
    }
  }
  return out;
}

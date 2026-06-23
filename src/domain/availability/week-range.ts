import { addDays, formatIso, parseIso } from "@/lib/stay-dates";
import type { DayAvailability } from "@/domain/availability/day";

export function mondayOfWeekIso(iso: string): string {
  const d = parseIso(iso);
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return formatIso(d);
}

export function weekDaysFromMonday(
  mondayIso: string,
  allDays: DayAvailability[]
): DayAvailability[] {
  const out: DayAvailability[] = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = addDays(mondayIso, i);
    const found = allDays.find((d) => d.iso === iso);
    if (found) out.push(found);
  }
  return out;
}

import { formatIso, parseIso } from "@/lib/stay-dates";

export function mondayOfWeekIso(iso: string): string {
  const d = parseIso(iso);
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return formatIso(d);
}

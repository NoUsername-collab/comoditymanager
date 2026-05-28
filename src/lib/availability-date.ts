import { formatDateWithDay } from "@/lib/ro-calendar";
import { parseIso, todayIso } from "@/lib/stay-dates";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseViewDate(iso: string | undefined, today?: string): string {
  if (!iso || !ISO_DATE.test(iso)) return today ?? todayIso();
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return today ?? todayIso();
  return iso;
}

export function viewDateLabel(iso: string, today?: string): string {
  const ref = today ?? todayIso();
  if (iso === ref) return "Azi";
  return formatDateWithDay(iso);
}

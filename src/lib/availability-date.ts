import { formatDateWithDay } from "@/lib/ro-calendar";
import { parseIso, todayIso } from "@/lib/stay-dates";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseViewDate(iso: string | undefined): string {
  if (!iso || !ISO_DATE.test(iso)) return todayIso();
  const d = parseIso(iso);
  if (Number.isNaN(d.getTime())) return todayIso();
  return iso;
}

export function viewDateLabel(iso: string): string {
  const today = todayIso();
  if (iso === today) return "Azi";
  return formatDateWithDay(iso);
}

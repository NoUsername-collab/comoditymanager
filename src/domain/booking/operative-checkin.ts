/** Check-in operativ permis doar în ziua planificată de sosire (YYYY-MM-DD). */
export function isOperativeCheckInDay(
  plannedCheckIn: string,
  today: string
): boolean {
  return plannedCheckIn === today;
}

/** Data calendaristică (locală) dintr-un timestamp ISO sau datetime-local. */
export function operativeCheckInDateFromAt(at?: string | null): string {
  const raw = at?.trim();
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return isoDateLocal(now);
  }
  return isoDateLocal(d);
}

function isoDateLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function canOfferOperativeCheckIn(args: {
  status: string;
  plannedCheckIn: string;
  today: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
}): boolean {
  if (args.status !== "confirmata") return false;
  if (args.actualCheckInAt || args.actualCheckOutAt) return false;
  return isOperativeCheckInDay(args.plannedCheckIn, args.today);
}

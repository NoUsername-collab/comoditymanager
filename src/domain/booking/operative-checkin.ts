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

export type OperativeCheckInBooking = {
  status: string;
  check_in: string;
  actual_check_in_at?: string | null;
  actual_check_out_at?: string | null;
  has_checkin_record?: boolean;
};

export function isStayCheckedIn(args: {
  actualCheckInAt?: string | null;
  hasCheckinRecord?: boolean;
}): boolean {
  return !!(args.actualCheckInAt || args.hasCheckinRecord);
}

export function canOfferOperativeCheckIn(args: {
  status: string;
  plannedCheckIn: string;
  today: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  hasCheckinRecord?: boolean;
}): boolean {
  if (args.status !== "confirmata") return false;
  if (isStayCheckedIn(args) || args.actualCheckOutAt) return false;
  return isOperativeCheckInDay(args.plannedCheckIn, args.today);
}

export function canOfferOperativeCheckInFromBooking(
  booking: OperativeCheckInBooking,
  today: string
): boolean {
  return canOfferOperativeCheckIn({
    status: booking.status,
    plannedCheckIn: booking.check_in,
    today,
    actualCheckInAt: booking.actual_check_in_at,
    actualCheckOutAt: booking.actual_check_out_at,
    hasCheckinRecord: booking.has_checkin_record,
  });
}

export function filterBookingsForOperativeCheckIn<T extends OperativeCheckInBooking>(
  bookings: T[],
  today: string
): T[] {
  return bookings
    .filter((b) => canOfferOperativeCheckInFromBooking(b, today))
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
}

/** Timestamp-ul ales trebuie să cadă în ziua planificată de sosire. */
export function isOperativeCheckInTimestampValid(
  plannedCheckIn: string,
  at?: string | null
): boolean {
  return operativeCheckInDateFromAt(at) === plannedCheckIn;
}

/** Limite datetime-local pentru check-in (o singură zi). */
export function operativeCheckInDatetimeBounds(plannedCheckIn: string): {
  min: string;
  max: string;
} {
  return {
    min: `${plannedCheckIn}T00:00`,
    max: `${plannedCheckIn}T23:59`,
  };
}

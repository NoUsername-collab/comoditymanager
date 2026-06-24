import { parseIso } from "@/lib/stay-dates";

/** Stay passed planned departure with no operational check-out recorded. */
export function isOverdueUnclosedStay(args: {
  plannedCheckOut: string;
  today: string;
  actualCheckOutAt?: string | null;
}): boolean {
  if (args.actualCheckOutAt?.trim()) return false;
  if (!args.plannedCheckOut || !args.today) return false;
  return args.plannedCheckOut < args.today;
}

/** Whole calendar days since planned check-out (0 when not overdue). */
export function daysSincePlannedCheckout(
  plannedCheckOut: string,
  today: string
): number {
  if (!plannedCheckOut || !today || today <= plannedCheckOut) return 0;
  const planned = parseIso(plannedCheckOut);
  const current = parseIso(today);
  const ms = current.getTime() - planned.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

/** Default datetime-local for closing an overdue stay at planned departure hour. */
export function defaultOperativeCheckoutDatetime(
  plannedCheckOut: string,
  checkoutTimeUntil: string | null | undefined
): string {
  const time = checkoutTimeUntil?.trim().slice(0, 5) || "12:00";
  return `${plannedCheckOut}T${time}`;
}

/** Early-departure policy applies only before/on planned departure day. */
export function shouldApplyEarlyDeparturePolicy(
  plannedCheckOut: string,
  today: string,
  actualCheckOutAt?: string | null
): boolean {
  if (isOverdueUnclosedStay({ plannedCheckOut, today, actualCheckOutAt })) {
    return false;
  }
  return true;
}

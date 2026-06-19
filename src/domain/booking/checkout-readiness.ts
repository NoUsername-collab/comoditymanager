import type { CheckinSettings, StoredPaymentStatus } from "@/domain/checkin/types";

export function isUnpaidForCheckout(
  paymentStatus: StoredPaymentStatus | null | undefined
): boolean {
  return (
    paymentStatus == null ||
    paymentStatus === "unpaid" ||
    paymentStatus === "partial"
  );
}

export function shouldBlockCheckoutForUnpaid(
  settings: Pick<CheckinSettings, "checkout_block_unpaid">,
  paymentStatus: StoredPaymentStatus | null | undefined
): boolean {
  if (!settings.checkout_block_unpaid) return false;
  return isUnpaidForCheckout(paymentStatus);
}

function timeFromDatetimeLocal(value: string): string | null {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? null;
}

function dateFromDatetimeLocal(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** Reception note only — no automatic fee. */
export function isLateCheckout(
  atLocal: string,
  settings: Pick<CheckinSettings, "checkout_time_until">
): boolean {
  const until = settings.checkout_time_until;
  if (!until) return false;
  const at = timeFromDatetimeLocal(atLocal);
  if (!at) return false;
  return at > until.slice(0, 5);
}

/** Left on a calendar day before the planned check-out date. */
export function isEarlyDepartureDate(
  atLocal: string,
  plannedCheckOut: string
): boolean {
  const atDate = dateFromDatetimeLocal(atLocal);
  if (!atDate || !plannedCheckOut) return false;
  return atDate < plannedCheckOut;
}

/** On planned check-out day, left before the configured hour. */
export function isEarlyDepartureTime(
  atLocal: string,
  plannedCheckOut: string,
  settings: Pick<CheckinSettings, "checkout_time_until">
): boolean {
  const atDate = dateFromDatetimeLocal(atLocal);
  if (atDate !== plannedCheckOut) return false;
  const until = settings.checkout_time_until;
  if (!until) return false;
  const at = timeFromDatetimeLocal(atLocal);
  if (!at) return false;
  return at < until.slice(0, 5);
}

/** True when operational check-out happened before the planned window. */
export function isEarlyDeparture(
  atLocal: string,
  plannedCheckOut: string,
  settings: Pick<CheckinSettings, "checkout_time_until">
): boolean {
  return (
    isEarlyDepartureDate(atLocal, plannedCheckOut) ||
    isEarlyDepartureTime(atLocal, plannedCheckOut, settings)
  );
}

export type EarlyDeparturePolicy = Pick<
  CheckinSettings,
  "early_checkout_allowed" | "early_checkout_fee"
>;

export function buildCheckoutActivityMetadata(args: {
  at: string;
  atLocal: string;
  plannedCheckOut: string;
  settings: Pick<
    CheckinSettings,
    | "checkout_time_until"
    | "early_checkout_allowed"
    | "early_checkout_fee"
    | "late_checkout_allowed"
    | "late_checkout_fee"
  >;
}): Record<string, unknown> {
  return {
    at: args.at,
    planned_check_out: args.plannedCheckOut,
    early_departure: isEarlyDeparture(
      args.atLocal,
      args.plannedCheckOut,
      args.settings
    ),
    late_departure: isLateCheckout(args.atLocal, args.settings),
    early_checkout_allowed: args.settings.early_checkout_allowed,
    early_checkout_fee: args.settings.early_checkout_fee,
    late_checkout_allowed: args.settings.late_checkout_allowed,
    late_checkout_fee: args.settings.late_checkout_fee,
  };
}

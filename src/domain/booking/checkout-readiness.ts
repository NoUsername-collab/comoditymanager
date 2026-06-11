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

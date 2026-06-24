import { computePaymentTotals } from "@/domain/payments/ledger";
import type { PaymentEntry } from "@/domain/payments/types";
import type {
  BookingForCheckin,
  CheckinSettings,
  PaymentStatus,
  StoredPaymentStatus,
} from "@/domain/checkin/types";

export type CheckinPaymentSnapshot = {
  paymentStatus: StoredPaymentStatus;
  paymentAmountPaid: number;
};

export type ResolvedCheckinPayment = CheckinPaymentSnapshot & {
  fromLedger: boolean;
};

/** Prefer booking_payments ledger when entries exist; otherwise fall back to check-in row. */
export function resolveCheckinPaymentFromLedger(
  totalDue: number,
  checkinPayment: CheckinPaymentSnapshot | null | undefined,
  ledgerPayments: PaymentEntry[],
): ResolvedCheckinPayment {
  if (ledgerPayments.length > 0) {
    const totals = computePaymentTotals(totalDue, ledgerPayments);
    return {
      paymentStatus: totals.derivedStatus,
      paymentAmountPaid: totals.totalPaid,
      fromLedger: true,
    };
  }

  if (checkinPayment) {
    return {
      paymentStatus: checkinPayment.paymentStatus,
      paymentAmountPaid: checkinPayment.paymentAmountPaid,
      fromLedger: false,
    };
  }

  return {
    paymentStatus: "unpaid",
    paymentAmountPaid: 0,
    fromLedger: false,
  };
}

export function isCheckinPaymentSettled(
  status: PaymentStatus | StoredPaymentStatus | null | undefined,
  totalPrice: number,
): boolean {
  if (totalPrice <= 0) return true;
  return status === "paid";
}

export function checkinPaymentBalance(
  totalPrice: number,
  amountPaid: number,
): number {
  if (totalPrice <= 0) return 0;
  return Math.max(0, totalPrice - amountPaid);
}

export type BookingCheckinPaymentPanelData = {
  checkinId: string;
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  totalPrice: number;
  paymentStatus: StoredPaymentStatus;
  paymentAmountPaid: number;
  depositAmount: number;
  settings: CheckinSettings;
  bookingForCheckin: BookingForCheckin;
};

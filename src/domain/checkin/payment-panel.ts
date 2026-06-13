import type {
  BookingForCheckin,
  CheckinSettings,
  PaymentStatus,
  StoredPaymentStatus,
} from "@/domain/checkin/types";

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

import type { StoredPaymentStatus } from "@/domain/checkin/types";

export type BookingCheckoutPanelData = {
  bookingId: string;
  guestId: string | null;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  roomNames: string[];
  totalPrice: number | null;
  paymentStatus: StoredPaymentStatus | null;
  paymentAmountPaid: number;
  checkoutBlockUnpaid: boolean;
  checkoutTimeUntil: string | null;
  existingReviewStars: number | null;
  existingReviewPositiveNote: string | null;
  existingReviewNegativeNote: string | null;
};

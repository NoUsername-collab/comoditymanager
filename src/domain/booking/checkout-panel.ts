import type { StoredPaymentStatus } from "@/domain/checkin/types";
import type { GuestStayReviewPolarity } from "@/domain/guest/types";

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
  existingReviewPolarity: GuestStayReviewPolarity | null;
  existingReviewIntensity: number | null;
  existingReviewNote: string | null;
};

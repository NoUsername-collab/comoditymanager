/**
 * REZOVA Email — barrel export
 *
 * Usage:
 *   import { notifyOwnerNewRequest, notifyGuestConfirmed } from "@/lib/email";
 */

export { sendEmail, getEmailProvider } from "@/lib/email/provider";
export type { EmailMessage, EmailResult, IEmailProvider } from "@/lib/email/provider";

export {
  notifyOwnerNewRequest,
  notifyGuestConfirmed,
  notifyGuestCancelled,
} from "@/lib/email/notify";

export {
  newBookingRequestToOwner,
  bookingConfirmedToGuest,
  bookingCancelledToGuest,
  dailySummaryToOwner,
} from "@/lib/email/templates";

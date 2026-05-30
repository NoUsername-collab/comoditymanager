/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Notification Dispatcher                              ║
 * ║                                                                ║
 * ║  High-level notification functions called from server actions. ║
 * ║  Each function: builds template → sends via provider.          ║
 * ║  Failures are logged but NEVER block the main operation.       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { sendEmail, type EmailResult } from "@/lib/email/provider";
import {
  newBookingRequestToOwner,
  bookingConfirmedToGuest,
  bookingCancelledToGuest,
} from "@/lib/email/templates";

/** Log email failures without crashing the main flow */
function logEmailResult(context: string, result: EmailResult): void {
  if (!result.success) {
    console.error(`[EMAIL-FAIL] ${context}: ${result.error}`);
  }
}

// ─── Notify owner: new booking request ──────────────────────────
export async function notifyOwnerNewRequest(data: {
  ownerEmail: string;
  pensionName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: string[];
  bookingId: string;
  baseUrl: string;
}): Promise<void> {
  try {
    const template = newBookingRequestToOwner({
      pensionName: data.pensionName,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      rooms: data.rooms,
      adminUrl: `${data.baseUrl}/admin/bookings/${data.bookingId}`,
    });

    const result = await sendEmail({
      to: data.ownerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: data.guestEmail,
    });

    logEmailResult("notifyOwnerNewRequest", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyOwnerNewRequest:", error);
  }
}

// ─── Notify guest: booking confirmed ────────────────────────────
export async function notifyGuestConfirmed(data: {
  guestEmail: string;
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  rooms: string[];
  totalPrice: number;
  currency?: string;
  checkInTime?: string;
  checkOutTime?: string;
}): Promise<void> {
  try {
    const template = bookingConfirmedToGuest({
      pensionName: data.pensionName,
      guestName: data.guestName,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      rooms: data.rooms,
      totalPrice: data.totalPrice,
      currency: data.currency ?? "RON",
      checkInTime: data.checkInTime ?? "14:00",
      checkOutTime: data.checkOutTime ?? "11:00",
    });

    const result = await sendEmail({
      to: data.guestEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logEmailResult("notifyGuestConfirmed", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyGuestConfirmed:", error);
  }
}

// ─── Notify guest: booking cancelled ────────────────────────────
export async function notifyGuestCancelled(data: {
  guestEmail: string;
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}): Promise<void> {
  try {
    const template = bookingCancelledToGuest({
      pensionName: data.pensionName,
      guestName: data.guestName,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      reason: data.reason,
    });

    const result = await sendEmail({
      to: data.guestEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logEmailResult("notifyGuestCancelled", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyGuestCancelled:", error);
  }
}

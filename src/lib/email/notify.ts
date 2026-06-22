import { sendEmail, type EmailResult } from "@/lib/email/provider";
import {
  newBookingRequestToOwner,
  bookingConfirmedToGuest,
  bookingCancelledToGuest,
  guestAppLinkToGuest,
  dailySummaryToOwner,
} from "@/lib/email/templates";
import type { EmailSettings } from "@/services/email-settings";
import { getEmailSettings } from "@/services/email-settings";
import {
  resolveTransactionalEmailIdentity,
  resolveTransactionalEmailIdentityForTenant,
  type TransactionalEmailIdentity,
} from "@/services/email-identity";

type EmailNotifyFlag =
  | "email_notify_new_request"
  | "email_notify_confirmation"
  | "email_notify_cancellation"
  | "email_notify_daily_summary";

/** Load tenant email settings; null when load fails (callers still send — legacy behavior). */
export async function loadEmailSettingsSafe(): Promise<EmailSettings | null> {
  return getEmailSettings().catch(() => null);
}

/** True when a notification should be sent given loaded settings. */
export function shouldSendEmailNotification(
  settings: EmailSettings | null | undefined,
  flag?: EmailNotifyFlag,
): boolean {
  if (!settings) return true;
  if (!settings.email_enabled) return false;
  if (flag && !settings[flag]) return false;
  return true;
}

function logEmailResult(context: string, result: EmailResult): void {
  if (!result.success) {
    console.error(`[EMAIL-FAIL] ${context}: ${result.error}`);
  }
}

function pickReplyTo(
  identity: TransactionalEmailIdentity,
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return identity.defaultReplyTo ?? undefined;
}

async function loadIdentity() {
  return resolveTransactionalEmailIdentity();
}

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
  emailSettings?: EmailSettings;
}): Promise<void> {
  if (!shouldSendEmailNotification(data.emailSettings, "email_notify_new_request")) {
    return;
  }
  try {
    const identity = await loadIdentity();
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
      from: identity.fromAddress,
      to: data.ownerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: pickReplyTo(
        identity,
        data.emailSettings?.email_reply_to,
        data.guestEmail,
      ),
    });

    logEmailResult("notifyOwnerNewRequest", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyOwnerNewRequest:", error);
  }
}

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
  guestAppUrl?: string;
  emailSettings?: EmailSettings;
}): Promise<void> {
  if (!shouldSendEmailNotification(data.emailSettings, "email_notify_confirmation")) {
    return;
  }
  try {
    const identity = await loadIdentity();
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
      guestAppUrl: data.guestAppUrl,
    });

    const result = await sendEmail({
      from: identity.fromAddress,
      to: data.guestEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: pickReplyTo(identity, data.emailSettings?.email_reply_to),
    });

    logEmailResult("notifyGuestConfirmed", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyGuestConfirmed:", error);
  }
}

export async function notifyGuestAppLink(data: {
  guestEmail: string;
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guestAppUrl: string;
  checkInTime?: string;
  checkOutTime?: string;
  emailSettings?: EmailSettings;
}): Promise<void> {
  if (!shouldSendEmailNotification(data.emailSettings)) {
    return;
  }
  try {
    const identity = await loadIdentity();
    const template = guestAppLinkToGuest({
      pensionName: data.pensionName,
      guestName: data.guestName,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guestAppUrl: data.guestAppUrl,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
    });

    const result = await sendEmail({
      from: identity.fromAddress,
      to: data.guestEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: pickReplyTo(identity, data.emailSettings?.email_reply_to),
    });

    logEmailResult("notifyGuestAppLink", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyGuestAppLink:", error);
  }
}

export async function notifyGuestCancelled(data: {
  guestEmail: string;
  pensionName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
  emailSettings?: EmailSettings;
}): Promise<void> {
  if (
    data.emailSettings &&
    (!data.emailSettings.email_enabled ||
      !data.emailSettings.email_notify_cancellation)
  ) {
    return;
  }
  try {
    const identity = await loadIdentity();
    const template = bookingCancelledToGuest({
      pensionName: data.pensionName,
      guestName: data.guestName,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      reason: data.reason,
    });

    const result = await sendEmail({
      from: identity.fromAddress,
      to: data.guestEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: pickReplyTo(identity, data.emailSettings?.email_reply_to),
    });

    logEmailResult("notifyGuestCancelled", result);
  } catch (error) {
    console.error("[EMAIL-CRASH] notifyGuestCancelled:", error);
  }
}

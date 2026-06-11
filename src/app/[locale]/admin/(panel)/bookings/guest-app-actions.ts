"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/require-admin";
import { platformSiteUrl } from "@/lib/platform/branding";
import { getBookingById } from "@/services/bookings";
import {
  issueGuestAccessForBooking,
  resolveGuestAccessLinkForBooking,
} from "@/services/guest-app/access";
import { buildGuestAppStayUrl } from "@/services/guest-app/url";
import { getGuestAppSettings } from "@/services/guest-app/settings";
import { getTenantDisplayName } from "@/services/tenants";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { notifyGuestAppLink } from "@/lib/email/notify";
import { getPensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return platformSiteUrl(host);
}

export async function loadGuestAccessLinkAction(bookingId: string): Promise<
  | { ok: true; url: string; accessCode: string }
  | { ok: false; error: string }
> {
  await requireAdmin();
  const t = await getTranslations("admin.pages.guestApp");

  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
  if (booking.status !== "confirmata") {
    return { ok: false, error: t("errors.notConfirmed") };
  }

  const settings = await getGuestAppSettings();
  if (!settings.enabled) {
    return { ok: false, error: t("errors.appDisabled") };
  }

  const link = await resolveGuestAccessLinkForBooking(
    bookingId,
    await resolveBaseUrl(),
  );
  if (!link) return { ok: false, error: t("errors.linkUnavailable") };

  return { ok: true, url: link.url, accessCode: link.accessCode };
}

export async function regenerateGuestAccessAction(
  bookingId: string,
): Promise<
  | { ok: true; url: string; accessCode: string }
  | { ok: false; error: string }
> {
  await requireAdmin();
  const t = await getTranslations("admin.pages.guestApp");

  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
  if (booking.status !== "confirmata") {
    return { ok: false, error: t("errors.notConfirmed") };
  }

  const code = await issueGuestAccessForBooking(bookingId);
  if (!code) return { ok: false, error: t("errors.linkUnavailable") };

  const url = buildGuestAppStayUrl(await resolveBaseUrl(), code);
  return { ok: true, url, accessCode: code };
}

export async function sendGuestAppLinkEmailAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const t = await getTranslations("admin.pages.guestApp");

  const booking = await getBookingById(bookingId);
  if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
  if (!booking.guest_email?.trim()) {
    return { ok: false, error: t("errors.noEmail") };
  }
  if (booking.status !== "confirmata") {
    return { ok: false, error: t("errors.notConfirmed") };
  }

  const baseUrl = await resolveBaseUrl();
  const link = await resolveGuestAccessLinkForBooking(bookingId, baseUrl);
  if (!link) return { ok: false, error: t("errors.linkUnavailable") };

  const [tenantId, pensionSettings] = await Promise.all([
    resolveTenantIdForData(),
    getPensionSettings().catch(() => null),
  ]);
  const pensionName = await getTenantDisplayName(tenantId);

  await notifyGuestAppLink({
    guestEmail: booking.guest_email,
    pensionName,
    guestName: booking.guest_name,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    guestAppUrl: link.url,
    checkInTime: pensionSettings?.default_check_in_time,
    checkOutTime: pensionSettings?.default_check_out_time,
  });

  return { ok: true };
}

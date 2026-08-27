"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth/require-staff";
import { canStaffPermission } from "@/domain/settings/team-permissions";
import { getTeamPermissions } from "@/services/pension-settings";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { resolveTenantPublicSiteUrl } from "@/lib/tenant/site-url";
import { getBookingById } from "@/services/bookings";
import {
  issueGuestAccessForBooking,
  resolveGuestAccessLinkForBooking,
} from "@/services/guest-app/access";
import { buildGuestAppStayUrl } from "@/services/guest-app/url";
import { enableGuestAppForOwner } from "@/services/guest-app/mutations";
import { getGuestAppSettings } from "@/services/guest-app/settings";
import { getTenantDisplayName } from "@/services/tenants";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { notifyGuestAppLink } from "@/lib/email/notify";
import { getPensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";
import { createPublicAdminClient } from "@/lib/supabase/admin";

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return resolveTenantPublicSiteUrl(host);
}

function isGuestAppOwner(staff: Awaited<ReturnType<typeof requireStaff>>): boolean {
  return staff.memberRole === "owner" || staff.role === "admin";
}

async function requireGuestAccessLinkPermission() {
  const [staff, tenant] = await Promise.all([requireStaff(), resolveRequestTenant()]);
  if (!tenant) throw new Error("auth.tenant_host_required");
  if (isGuestAppOwner(staff)) return { staff, tenant };
  const permissions = await getTeamPermissions();
  if (canStaffPermission(staff.memberRole, "booking_management", permissions)) {
    return { staff, tenant };
  }
  throw new Error("auth.permission_forbidden");
}

async function requireGuestAppOwnerAccess() {
  const [staff, tenant] = await Promise.all([requireStaff(), resolveRequestTenant()]);
  if (!tenant) throw new Error("auth.tenant_host_required");
  if (!isGuestAppOwner(staff)) {
    throw new Error("auth.role_forbidden");
  }
  return { staff, tenant };
}

async function bookingExistsInPublic(
  tenantId: string,
  bookingId: string,
): Promise<boolean> {
  const supabase = createPublicAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();
  return !!data;
}

export async function enableGuestAppFromOwnerAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const { tenant } = await requireGuestAppOwnerAccess();
    await enableGuestAppForOwner(tenant.id);
    revalidatePath("/admin/settings/guest-app");
    revalidatePath("/stay", "layout");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function loadGuestAccessLinkAction(bookingId: string): Promise<
  | { ok: true; url: string; accessCode: string }
  | { ok: false; error: string }
> {
  try {
    const [t, { staff, tenant }] = await Promise.all([
      getTranslations("admin.pages.guestApp"),
      requireGuestAccessLinkPermission(),
    ]);

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
    if (booking.status !== "confirmata") {
      return { ok: false, error: t("errors.notConfirmed") };
    }

    if (isGuestAppOwner(staff)) {
      await enableGuestAppForOwner(tenant.id);
    } else {
      const settings = await getGuestAppSettings();
      if (!settings.enabled) {
        return { ok: false, error: t("errors.appDisabled") };
      }
    }

    if (!(await bookingExistsInPublic(tenant.id, bookingId))) {
      return { ok: false, error: t("errors.simBookingOnly") };
    }

    const link = await resolveGuestAccessLinkForBooking(
      bookingId,
      await resolveBaseUrl(),
    );
    if (!link) return { ok: false, error: t("errors.linkUnavailable") };

    return { ok: true, url: link.url, accessCode: link.accessCode };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function regenerateGuestAccessAction(
  bookingId: string,
): Promise<
  | { ok: true; url: string; accessCode: string }
  | { ok: false; error: string }
> {
  try {
    const t = await getTranslations("admin.pages.guestApp");
    const { tenant } = await requireGuestAppOwnerAccess();

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
    if (booking.status !== "confirmata") {
      return { ok: false, error: t("errors.notConfirmed") };
    }

    await enableGuestAppForOwner(tenant.id);

    if (!(await bookingExistsInPublic(tenant.id, bookingId))) {
      return { ok: false, error: t("errors.simBookingOnly") };
    }

    const code = await issueGuestAccessForBooking(bookingId);
    if (!code) return { ok: false, error: t("errors.linkUnavailable") };

    revalidatePath("/stay", "layout");

    const url = buildGuestAppStayUrl(await resolveBaseUrl(), code);
    return { ok: true, url, accessCode: code };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function sendGuestAppLinkEmailAction(
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const t = await getTranslations("admin.pages.guestApp");
    const { tenant } = await requireGuestAppOwnerAccess();

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: t("errors.bookingNotFound") };
    if (!booking.guest_email?.trim()) {
      return { ok: false, error: t("errors.noEmail") };
    }
    if (booking.status !== "confirmata") {
      return { ok: false, error: t("errors.notConfirmed") };
    }

    await enableGuestAppForOwner(tenant.id);

    const baseUrl = await resolveBaseUrl();
    const link = await resolveGuestAccessLinkForBooking(bookingId, baseUrl);
    if (!link) return { ok: false, error: t("errors.linkUnavailable") };

    const { getEmailSettings } = await import("@/services/email-settings");
    const [tenantId, pensionSettings, emailSettings] = await Promise.all([
      resolveTenantIdForData(),
      getPensionSettings().catch(() => null),
      getEmailSettings().catch(() => null),
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
      emailSettings: emailSettings ?? undefined,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

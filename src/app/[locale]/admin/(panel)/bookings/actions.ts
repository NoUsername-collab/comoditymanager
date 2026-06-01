"use server";

import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { revalidateBookingDetailSurfaces } from "@/lib/cache/revalidate-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  cancelBooking,
  confirmBookingWithRooms,
  editBookingCheckIn,
  editBookingCheckOut,
  setBookingCheckIn,
  setBookingCheckOut,
  undoBookingCheckIn,
  undoBookingCheckOut,
  updateBookingGuestPhone,
} from "@/services/bookings";
import { resolveTotalPriceForConfirm } from "@/services/booking-confirm";
import { getTranslations } from "next-intl/server";

function safeAdminReturnPath(raw: string, fallback: string): string {
  const path = raw.trim();
  if (!path.startsWith("/admin") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

export async function confirmBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const total_price = await resolveTotalPriceForConfirm(id, roomIds, formData);
  const returnTo = safeAdminReturnPath(
    String(formData.get("return_to") ?? ""),
    "/admin/calendar?confirmed=1"
  );

  const { getBookingById } = await import("@/services/bookings");
  const before = await getBookingById(id);
  const wasCancelled = before?.status === "anulata";

  await confirmBookingWithRooms(id, roomIds, total_price);

  // Notify guest (non-blocking) — pension name from DB
  (async () => {
    try {
      const { resolveTenantIdForData } = await import("@/lib/tenant/resolve-id");
      const { getTenantDisplayName } = await import("@/services/tenants");
      const pensionName = await getTenantDisplayName(await resolveTenantIdForData());
      const { getBookingById } = await import("@/services/bookings");
      const booking = await getBookingById(id);
      if (!booking || !booking.guest_email) return;
      const { notifyGuestConfirmed } = await import("@/lib/email/notify");
      await notifyGuestConfirmed({
        guestEmail: booking.guest_email,
        pensionName,
        guestName: booking.guest_name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        rooms: booking.room_names,
        totalPrice: total_price,
      });
    } catch { /* email failure must never crash */ }
  })();

  revalidateBookingDetailSurfaces(id);
  const dest =
    wasCancelled && !returnTo.includes("confirmed=")
      ? appendQueryParam(returnTo, "reaccepted", "1")
      : returnTo;
  await redirect(dest);
}

function appendQueryParam(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function cancelBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/bookings");

  // Capture booking data BEFORE cancellation for email notification
  const { getBookingById } = await import("@/services/bookings");
  const bookingBefore = await getBookingById(id).catch(() => null);

  await cancelBooking(id);

  // Notify guest (non-blocking) — pension name from DB
  if (bookingBefore?.guest_email) {
    (async () => {
      try {
        const { resolveTenantIdForData } = await import("@/lib/tenant/resolve-id");
        const { getTenantDisplayName } = await import("@/services/tenants");
        const pensionName = await getTenantDisplayName(await resolveTenantIdForData());
        const { notifyGuestCancelled } = await import("@/lib/email/notify");
        await notifyGuestCancelled({
          guestEmail: bookingBefore.guest_email,
          pensionName,
          guestName: bookingBefore.guest_name,
          checkIn: bookingBefore.check_in,
          checkOut: bookingBefore.check_out,
        });
      } catch { /* email failure must never crash */ }
    })();
  }

  revalidateBookingDetailSurfaces(id);
  const base = returnTo.startsWith("/admin") ? returnTo : "/admin/bookings";
  await redirect(appendQueryParam(base, "toast", "cancelled"));
}

type OpsActionResult = { ok: true } | { ok: false; error: string };

function readBookingId(formData: FormData): string {
  return String(formData.get("id") ?? "").trim();
}

function readAt(formData: FormData): string | undefined {
  const at = String(formData.get("at") ?? "").trim();
  return at || undefined;
}

function mapBookingOpsError(
  e: unknown,
  t: Awaited<ReturnType<typeof getTranslations<"admin.serverActions">>>
): string {
  if (e instanceof Error) {
    if (e.message === "booking.phone_required_for_checkin") {
      return t("phoneRequiredCheckIn");
    }
    if (e.message === "guest.phone_required") {
      return t("phoneRequired");
    }
  }
  return e instanceof Error ? e.message : t("checkInError");
}

export async function updateBookingGuestPhoneAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  const phone = String(formData.get("guest_phone") ?? "").trim();
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await updateBookingGuestPhone(id, phone);
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: mapBookingOpsError(e, t),
    };
  }
}

export async function setBookingCheckInAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await setBookingCheckIn(id, readAt(formData));
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: mapBookingOpsError(e, t),
    };
  }
}

export async function setBookingCheckOutAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await setBookingCheckOut(id, readAt(formData));
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("checkOutError"),
    };
  }
}

export async function undoBookingCheckInAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await undoBookingCheckIn(id);
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "booking.undo_checkout_first") {
      return { ok: false, error: t("undoCheckoutFirst") };
    }
    if (e instanceof Error && e.message === "booking.checkin_not_recorded") {
      return { ok: false, error: t("checkInNotRecorded") };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("undoCheckInError"),
    };
  }
}

export async function undoBookingCheckOutAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await undoBookingCheckOut(id);
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("undoCheckOutError"),
    };
  }
}

export async function editBookingCheckInAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await editBookingCheckIn(id, readAt(formData));
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("checkInError"),
    };
  }
}

export async function editBookingCheckOutAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };
  try {
    await editBookingCheckOut(id, readAt(formData));
    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("checkOutError"),
    };
  }
}

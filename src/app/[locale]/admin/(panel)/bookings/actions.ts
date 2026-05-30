"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { CACHE_TAGS } from "@/lib/cache-tags";
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

function revalidateBookingPaths(bookingId: string) {
  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath(`/admin/bookings/${bookingId}/factura`);
  revalidatePath("/admin");
  revalidatePath("/admin/istoric");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/statistics");
  revalidatePath("/calendar");
}

export async function confirmBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const total_price = await resolveTotalPriceForConfirm(id, roomIds, formData);

  await confirmBookingWithRooms(id, roomIds, total_price);

  // Notify guest (non-blocking) — pension name from DB
  (async () => {
    try {
      const { getTenantDisplayName } = await import("@/services/tenants");
      const pensionName = await getTenantDisplayName();
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

  revalidateBookingPaths(id);
  await redirect("/admin/calendar?confirmed=1");
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
        const { getTenantDisplayName } = await import("@/services/tenants");
        const pensionName = await getTenantDisplayName();
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

  revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
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
    revalidateBookingPaths(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("checkOutError"),
    };
  }
}

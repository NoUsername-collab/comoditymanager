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
  const id = String(formData.get("id") ?? "");
  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const returnTo = safeAdminReturnPath(
    String(formData.get("return_to") ?? ""),
    "/admin/calendar?confirmed=1"
  );

  const [, total_price, before] = await Promise.all([
    requireAdmin(),
    resolveTotalPriceForConfirm(id, roomIds, formData),
    import("@/services/bookings").then((m) => m.getBookingById(id)),
  ]);
  const wasCancelled = before?.status === "anulata";

  await confirmBookingWithRooms(id, roomIds, total_price);

  // Notify guest (non-blocking) — include guest app link when available
  (async () => {
    try {
      const { headers } = await import("next/headers");
      const { resolveTenantPublicSiteUrl } = await import("@/lib/tenant/site-url");
      const { resolveTenantIdForData } = await import("@/lib/tenant/resolve-id");
      const { getTenantDisplayName } = await import("@/services/tenants");
      const { getPensionSettings } = await import("@/services/pension-settings");
      const pensionName = await getTenantDisplayName(await resolveTenantIdForData());
      const { getBookingById } = await import("@/services/bookings");
      const booking = await getBookingById(id);
      if (!booking || !booking.guest_email) return;

      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host");
      const baseUrl = await resolveTenantPublicSiteUrl(host);
      const { resolveGuestAccessLinkForBooking } = await import(
        "@/services/guest-app/access"
      );
      const link = await resolveGuestAccessLinkForBooking(id, baseUrl);
      const pensionSettings = await getPensionSettings().catch(() => null);

      const { notifyGuestConfirmed } = await import("@/lib/email/notify");
      await notifyGuestConfirmed({
        guestEmail: booking.guest_email,
        pensionName,
        guestName: booking.guest_name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        rooms: booking.room_names,
        totalPrice: total_price,
        checkInTime: pensionSettings?.default_check_in_time,
        checkOutTime: pensionSettings?.default_check_out_time,
        guestAppUrl: link?.url,
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
  const base = safeAdminReturnPath(returnTo, "/admin/bookings");
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
    if (e.message === "booking.checkin_only_on_arrival_day") {
      return t("checkInOnlyOnArrivalDay");
    }
    if (e.message === "booking.checkout_blocked_unpaid") {
      return t("checkoutBlockedUnpaid");
    }
    if (e.message === "booking.checkin_required_before_checkout") {
      return t("checkoutNeedsCheckin");
    }
    if (e.message === "booking.checkout_already_recorded") {
      return t("checkoutAlreadyDone");
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
      error: mapBookingOpsError(e, t),
    };
  }
}

export async function loadBookingCheckoutPanelAction(
  bookingId: string
): Promise<
  | { ok: true; data: import("@/domain/booking/checkout-panel").BookingCheckoutPanelData }
  | { ok: false; error: string }
> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = bookingId.trim();
  if (!id) return { ok: false, error: t("bookingIdMissing") };

  try {
    const { getBookingById } = await import("@/services/bookings");
    const { getCheckinByBookingId } = await import("@/services/checkin/queries");
    const { getCheckinSettings } = await import("@/services/checkin/settings");
    const { listGuestStayReviewsByBookingIds } = await import(
      "@/services/guest-profiles"
    );

    const [booking, checkin, settings, reviews] = await Promise.all([
      getBookingById(id),
      getCheckinByBookingId(id),
      getCheckinSettings(),
      listGuestStayReviewsByBookingIds([id]),
    ]);

    if (!booking || booking.status !== "confirmata") {
      return { ok: false, error: t("bookingNotFound") };
    }

    const review = reviews.get(id);

    return {
      ok: true,
      data: {
        bookingId: booking.id,
        guestId: booking.guest_id,
        guestName: booking.guest_name,
        plannedCheckIn: booking.check_in,
        plannedCheckOut: booking.check_out,
        actualCheckInAt: booking.actual_check_in_at,
        actualCheckOutAt: booking.actual_check_out_at,
        roomNames: booking.room_names,
        totalPrice: booking.total_price,
        paymentStatus: checkin?.payment_status ?? null,
        paymentAmountPaid: checkin?.payment_amount_paid ?? 0,
        checkoutBlockUnpaid: settings.checkout_block_unpaid,
        checkoutTimeUntil: settings.checkout_time_until,
        existingReviewStars: review?.stars ?? null,
        existingReviewPositiveNote: review?.positive_note ?? null,
        existingReviewNegativeNote: review?.negative_note ?? null,
        existingReviewPositiveStars: review?.positive_stars ?? null,
        existingReviewNegativeStars: review?.negative_stars ?? null,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("checkOutError"),
    };
  }
}

export async function completeBookingCheckoutAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  if (!id) return { ok: false, error: t("bookingIdMissing") };

  try {
    await setBookingCheckOut(id, readAt(formData));

    const addReview = formData.get("add_review") === "1";
    const guestId = String(formData.get("guest_id") ?? "").trim();
    if (addReview && guestId) {
      const { saveGuestStayReview } = await import("@/services/guest-profiles");
      const positiveNote = String(formData.get("positive_note") ?? "").trim();
      const negativeNote = String(formData.get("negative_note") ?? "").trim();
      if (positiveNote || negativeNote) {
        const positiveStarsRaw = String(formData.get("positive_stars") ?? "").trim();
        const negativeStarsRaw = String(formData.get("negative_stars") ?? "").trim();
        await saveGuestStayReview({
          guestId,
          bookingId: id,
          positiveNote,
          negativeNote,
          positiveStars: positiveStarsRaw ? Number(positiveStarsRaw) : null,
          negativeStars: negativeStarsRaw ? Number(negativeStarsRaw) : null,
        });
      }
    }

    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: mapBookingOpsError(e, t),
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

export async function editBookingDatesAction(
  formData: FormData
): Promise<OpsActionResult> {
  const t = await getTranslations("admin.serverActions");
  await requireAdmin();
  const id = readBookingId(formData);
  const check_in = String(formData.get("check_in") ?? "").trim();
  const check_out = String(formData.get("check_out") ?? "").trim();
  const num_adults = Math.max(1, Math.floor(Number(formData.get("num_adults") ?? 1)));
  const num_children = Math.max(0, Math.floor(Number(formData.get("num_children") ?? 0)));

  if (!id) return { ok: false, error: t("bookingIdMissing") };
  if (!check_in || !check_out) return { ok: false, error: "fillRequired" };

  const { isAtLeastOneNight } = await import("@/domain/booking/conflict");
  if (!isAtLeastOneNight(check_in, check_out)) {
    return { ok: false, error: "minOneNight" };
  }

  try {
    const { getTenantScope } = await import("@/lib/tenant/scope");
    const { tenantId, supabase } = await getTenantScope();
    const { logAdminActivityFromSession } = await import("@/services/activity-log");
    const { getBookingById } = await import("@/services/bookings");

    const before = await getBookingById(id);
    if (!before) throw new Error("booking.not_found");

    const { error } = await supabase
      .from("bookings")
      .update({
        check_in,
        check_out,
        num_adults,
        num_children,
      })
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (error) throw new Error(error.message);

    // Sync segments if rooms are already assigned
    const { syncBookingRoomSegments } = await import("@/services/booking-segments");
    await syncBookingRoomSegments(id).catch(() => {});

    await logAdminActivityFromSession({
      action: "booking.dates_edited",
      entityType: "booking",
      entityId: id,
      summary: `Date modificate: ${check_in} → ${check_out}, ${num_adults}A/${num_children}C`,
      undoable: true,
      metadata: {
        check_in,
        check_out,
        num_adults,
        num_children,
        prev_check_in: before.check_in,
        prev_check_out: before.check_out,
        prev_num_adults: before.num_adults,
        prev_num_children: before.num_children,
      },
    });

    revalidateBookingDetailSurfaces(id);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "editDatesFailed",
    };
  }
}

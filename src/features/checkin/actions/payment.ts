"use server";

import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAnyStaff } from "@/lib/auth/require-admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { revalidateBookingOperativeSurfaces } from "@/lib/cache/revalidate-admin";
import { getTranslations } from "next-intl/server";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { getCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "@/services/bookings";
import { listBookingPayments } from "@/services/booking-payments";
import {
  resolveCheckinPaymentFromLedger,
  type BookingCheckinPaymentPanelData,
} from "@/domain/checkin/payment-panel";
import type { PaymentStatus } from "@/domain/checkin/types";
import { assertBookingPostCheckoutEditAllowed } from "@/services/bookings/post-checkout-guard";
import {
  getCheckinByBookingId,
  getCheckedInRoomsForBooking,
} from "@/services/checkin/queries";
import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { listRegisteredGuestsForCheckin } from "@/services/checkin/booking-guests";
import { updateCheckinPayment } from "@/services/checkin/update-payment";

export async function loadBookingCheckinPaymentPanelAction(
  bookingId: string,
): Promise<
  | { ok: true; data: BookingCheckinPaymentPanelData }
  | { ok: false; error: string }
> {
  await requireAnyStaff();

  try {
    const id = bookingId.trim();
    if (!id) return { ok: false, error: "booking_id required" };

    const [booking, checkin, settings] = await Promise.all([
      getBookingById(id),
      getCheckinByBookingId(id),
      getCheckinSettings(),
    ]);

    if (!booking || booking.status !== "confirmata") {
      const t = await getTranslations("admin.serverActions");
      return { ok: false, error: t("bookingNotFound") };
    }

    if (!checkin) {
      const t = await getTranslations("admin.checkinPayment");
      return { ok: false, error: t("noCheckin") };
    }

    const [checkedInRooms, registeredGuests] = await Promise.all([
      getCheckedInRoomsForBooking(id).catch(() => [] as string[]),
      listRegisteredGuestsForCheckin(
        id,
        booking.guest_id,
        booking.room_names,
      ).catch(() => []),
    ]);

    const bookingForCheckin = mapBookingToForCheckin({
      ...booking,
      checked_in_rooms: checkedInRooms,
      registered_guests: registeredGuests,
    });

    const ledgerPayments = await listBookingPayments(id);
    const resolved = resolveCheckinPaymentFromLedger(
      booking.total_price ?? 0,
      {
        paymentStatus: checkin.payment_status,
        paymentAmountPaid: Number(checkin.payment_amount_paid ?? 0),
      },
      ledgerPayments,
    );

    return {
      ok: true,
      data: {
        checkinId: checkin.id,
        bookingId: booking.id,
        guestName: booking.guest_name,
        plannedCheckIn: booking.check_in,
        plannedCheckOut: booking.check_out,
        totalPrice: booking.total_price ?? 0,
        paymentStatus: resolved.paymentStatus,
        paymentAmountPaid: resolved.paymentAmountPaid,
        depositAmount: Number(checkin.deposit_amount ?? 0),
        settings,
        bookingForCheckin,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    return { ok: false, error: msg };
  }
}

export async function updateCheckinPaymentAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireAnyStaff();

  try {
    const checkinId = String(formData.get("checkin_id") ?? "");
    const bookingId = String(formData.get("booking_id") ?? "");
    if (!checkinId) return { ok: false, error: "checkin_id required" };
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const paymentStatus =
      (formData.get("payment_status") as PaymentStatus) ?? "unpaid";
    const paymentAmountPaid = Number(formData.get("payment_amount_paid")) || 0;
    const depositAmount = Number(formData.get("deposit_amount")) || 0;

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };
    await assertBookingPostCheckoutEditAllowed(booking);

    const bookingForCheckin = mapBookingToForCheckin(booking);
    const settings = await getCheckinSettings();

    await updateCheckinPayment(
      checkinId,
      {
        payment_status: paymentStatus,
        payment_amount_paid: paymentAmountPaid,
        deposit_amount: depositAmount,
      },
      settings,
      bookingForCheckin,
    );

    after(async () => {
      const tenantId = await resolveTenantIdForData();
      revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
      revalidateTag(CACHE_TAGS.checkins, "max");
      revalidateBookingOperativeSurfaces(bookingId, tenantId);
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    if (msg.startsWith("checkin.blocked:")) {
      return { ok: false, error: msg.replace("checkin.blocked: ", "") };
    }
    return { ok: false, error: msg };
  }
}

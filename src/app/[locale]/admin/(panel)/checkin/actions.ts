"use server";

import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  revalidateBookingDetailSurfaces,
} from "@/lib/cache/revalidate-admin";
import { logAdminActivityFromSession } from "@/services/activity-log";
import { getTranslations } from "next-intl/server";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { createCheckin } from "@/services/checkin/create";
import { getCheckinSettings, updateCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "@/services/bookings";
import {
  getCheckinByBookingId,
  getCheckedInRoomsForBooking,
} from "@/services/checkin/queries";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { buildTouristSheetFromPersisted } from "@/domain/checkin/fisa-turist";
import type { TouristSheetData } from "@/domain/checkin/fisa-turist";
import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { mapPersistedCheckinGuestsToInput } from "@/domain/checkin/map-persisted-guests";
import type {
  CheckinFormData,
  CheckinGuestInput,
  PaymentStatus,
  CheckinType,
  BookingForCheckin,
  CheckinSettings,
} from "@/domain/checkin/types";
import { getCheckinGuests } from "@/services/checkin/queries";
import { listRegisteredGuestsForCheckin } from "@/services/checkin/booking-guests";
import { syncBookingOperativeCheckInFromRecord } from "@/services/checkin/sync";
import { revalidateBookingSurfacesExtended } from "@/lib/cache/revalidate-admin";

export type CheckinWizardContextResult = {
  ok: boolean;
  error?: string;
  booking?: BookingForCheckin;
  settings?: CheckinSettings;
  hasExistingCheckin?: boolean;
  checkedInRooms?: string[];
  roomCheckinComplete?: boolean;
};

export type CreateCheckinResult = {
  ok: boolean;
  error?: string;
  checkinId?: string;
};

export type LoadTouristSheetResult = {
  ok: boolean;
  error?: string;
  data?: TouristSheetData;
};

/**
 * Server action: load booking + settings for the full check-in wizard.
 */
export async function loadCheckinWizardContextAction(
  bookingId: string,
): Promise<CheckinWizardContextResult> {
  await requireAdmin();

  try {
    if (!bookingId) return { ok: false, error: "booking_id required" };

    let booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const settings = await getCheckinSettings();
    const existingCheckin = await getCheckinByBookingId(bookingId).catch(
      () => null,
    );

    if (existingCheckin && !booking.actual_check_in_at) {
      await syncBookingOperativeCheckInFromRecord(bookingId, existingCheckin);
      const tenantId = await resolveTenantIdForData();
      revalidateBookingSurfacesExtended({ bookingId, includeHistoric: true });
      booking = (await getBookingById(bookingId)) ?? booking;
    }

    const [checkedInRooms, registeredGuests] = await Promise.all([
      getCheckedInRoomsForBooking(bookingId).catch(() => [] as string[]),
      listRegisteredGuestsForCheckin(
        bookingId,
        booking.guest_id,
        booking.room_names,
      ).catch(() => []),
    ]);
    const progress = computeRoomCheckinProgress(
      booking.room_names,
      checkedInRooms,
    );

    return {
      ok: true,
      booking: mapBookingToForCheckin({
        ...booking,
        checked_in_rooms: checkedInRooms,
        registered_guests: registeredGuests,
      }),
      settings,
      hasExistingCheckin: progress.isComplete,
      checkedInRooms,
      roomCheckinComplete: progress.isComplete,
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

/**
 * Server action: create a check-in from the stepper form.
 */
export async function createCheckinAction(
  formData: FormData,
): Promise<CreateCheckinResult> {
  await requireAdmin();

  try {
    const bookingId = String(formData.get("booking_id") ?? "");
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const type = (formData.get("type") as CheckinType) ?? "reservation";
    const paymentStatus =
      (formData.get("payment_status") as PaymentStatus) ?? "unpaid";
    const paymentAmountPaid = Number(formData.get("payment_amount_paid")) || 0;
    const depositAmount = Number(formData.get("deposit_amount")) || 0;
    const keyHanded = formData.get("key_handed") === "true";
    const notes = String(formData.get("notes") ?? "").trim() || undefined;

    // Parse guests from JSON
    const guestsJson = String(formData.get("guests") ?? "[]");
    let guests: CheckinGuestInput[];
    try {
      guests = JSON.parse(guestsJson);
    } catch {
      return { ok: false, error: "Invalid guests data" };
    }

    if (!Array.isArray(guests) || guests.length === 0) {
      return { ok: false, error: "At least one room or guest required" };
    }

    const identityScopeRaw = String(formData.get("identity_scope") ?? "").trim();
    const identity_scope =
      identityScopeRaw === "rep" ||
      identityScopeRaw === "individual" ||
      identityScopeRaw === "per_room"
        ? identityScopeRaw
        : undefined;

    let reception_rooms: string[] | undefined;
    try {
      const roomsJson = String(formData.get("reception_rooms") ?? "[]");
      const parsed = JSON.parse(roomsJson);
      reception_rooms = Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === "string")
        : undefined;
    } catch {
      reception_rooms = undefined;
    }

    // Load booking data
    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const bookingForCheckin = mapBookingToForCheckin(booking);

    // Load settings
    const settings = await getCheckinSettings();

    // Build form data
    const checkinData: CheckinFormData = {
      type,
      booking_id: bookingId,
      guests,
      payment_status: paymentStatus,
      payment_amount_paid: paymentAmountPaid,
      deposit_amount: depositAmount,
      key_handed: keyHanded,
      notes,
      identity_scope,
      reception_rooms,
    };

    const checkinId = await createCheckin(checkinData, settings, bookingForCheckin);

    // Revalidate
    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateTag(CACHE_TAGS.checkins, "max");
    revalidateBookingDetailSurfaces(bookingId, tenantId);

    return { ok: true, checkinId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Server action: update check-in settings (owner panel).
 */
export async function updateCheckinSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  try {
    const input: Record<string, unknown> = {};

    const fields = [
      "checkin_doc_rule",
      "checkin_phone_rule",
      "checkin_cnp_rule",
      "checkin_payment_rule",
      "group_checkin_mode",
      "fisa_property_address",
      "fisa_owner_cui",
      "fisa_tourism_license",
    ];
    for (const f of fields) {
      const v = formData.get(f);
      if (v != null) input[f] = String(v);
    }

    const intFields = ["checkin_min_payment_pct"];
    for (const f of intFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const numFields = [
      "checkin_deposit_amount",
      "late_checkout_fee",
      "early_checkin_fee",
    ];
    for (const f of numFields) {
      const v = formData.get(f);
      if (v != null) input[f] = Number(v);
    }

    const boolFields = [
      "checkin_deposit",
      "walkin_allowed",
      "late_checkout_allowed",
      "checkout_block_unpaid",
      "early_checkin_allowed",
    ];
    for (const f of boolFields) {
      const v = formData.get(f);
      if (v != null) input[f] = v === "true";
    }

    const timeFields = ["checkin_time_from", "checkout_time_until"];
    for (const f of timeFields) {
      const v = formData.get(f);
      if (v != null) input[f] = String(v) || null;
    }

    await updateCheckinSettings(input);

    // Log settings change
    await logAdminActivityFromSession({
      action: "settings.updated",
      entityType: "settings",
      summary: "Check-in settings updated",
      metadata: { section: "checkin", ...input },
    });

    // Revalidate settings cache
    const tenantId = await resolveTenantIdForData();
    revalidateTag(
      tenantTag(tenantId, CACHE_TAGS.pensionSettings),
      "max",
    );
    revalidateTag(CACHE_TAGS.pensionSettings, "max");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Server action: rebuild fișa turist from a completed check-in.
 */
export async function loadTouristSheetAction(
  bookingId: string,
): Promise<LoadTouristSheetResult> {
  await requireAdmin();

  try {
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const checkin = await getCheckinByBookingId(bookingId);
    if (!checkin) {
      const t = await getTranslations("admin.pages.cazari");
      return {
        ok: false,
        error: booking.actual_check_in_at
          ? t("emitFisaLegacyCheckin")
          : t("emitFisaNoCheckin"),
      };
    }

    const [guestRows, settings] = await Promise.all([
      getCheckinGuests(checkin.id),
      getCheckinSettings(),
    ]);

    if (!guestRows.length) {
      const t = await getTranslations("admin.pages.cazari");
      return { ok: false, error: t("emitFisaNoGuests") };
    }

    const data = buildTouristSheetFromPersisted(
      mapBookingToForCheckin(booking),
      mapPersistedCheckinGuestsToInput(guestRows),
      settings,
      checkin.checked_in_at,
    );

    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    return { ok: false, error: msg };
  }
}

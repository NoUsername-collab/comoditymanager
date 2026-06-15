"use server";

import { revalidatePath, revalidateTag } from "next/cache";
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
import { updateCheckin } from "@/services/checkin/update";
import { getCheckinSettings, updateCheckinSettings, checkinSettingsCacheTag } from "@/services/checkin/settings";
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
import { updateCheckinPayment } from "@/services/checkin/update-payment";
import { revalidateBookingSurfacesExtended } from "@/lib/cache/revalidate-admin";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";
import { decodeCheckinTransferRequired } from "@/domain/checkin/identity-result";
import type { BookingCheckinPaymentPanelData } from "@/domain/checkin/payment-panel";

export type CheckinWizardContextResult = {
  ok: boolean;
  error?: string;
  booking?: BookingForCheckin;
  settings?: CheckinSettings;
  hasExistingCheckin?: boolean;
  checkedInRooms?: string[];
  roomCheckinComplete?: boolean;
  /** Populat când se editează un check-in existent. */
  editContext?: {
    checkinId: string;
    guests: CheckinGuestInput[];
    paymentStatus: PaymentStatus;
    paymentAmountPaid: number;
    depositAmount: number;
    keysHandedRooms: string[];
    notes: string;
  };
  /** Plată existentă la continuare camere (create mode). */
  partialPayment?: {
    paymentStatus: PaymentStatus;
    paymentAmountPaid: number;
    depositAmount: number;
  };
};

export type CreateCheckinResult = {
  ok: boolean;
  error?: string;
  checkinId?: string;
  needsTransfer?: boolean;
  transferOffer?: CheckinTransferOffer;
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
  options?: { edit?: boolean },
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

    const mappedBooking = mapBookingToForCheckin({
      ...booking,
      checked_in_rooms: checkedInRooms,
      registered_guests: registeredGuests,
    });

    if (options?.edit) {
      if (!existingCheckin) {
        const t = await getTranslations("admin.checkIn");
        return { ok: false, error: t("noCheckinToEdit") };
      }

      const guestRows = await getCheckinGuests(existingCheckin.id);
      if (!guestRows.length) {
        const t = await getTranslations("admin.pages.cazari");
        return { ok: false, error: t("emitFisaNoGuests") };
      }

      return {
        ok: true,
        booking: mappedBooking,
        settings,
        hasExistingCheckin: true,
        checkedInRooms,
        roomCheckinComplete: progress.isComplete,
        editContext: {
          checkinId: existingCheckin.id,
          guests: mapPersistedCheckinGuestsToInput(guestRows),
          paymentStatus: existingCheckin.payment_status,
          paymentAmountPaid: Number(existingCheckin.payment_amount_paid ?? 0),
          depositAmount: Number(existingCheckin.deposit_amount ?? 0),
          keysHandedRooms: existingCheckin.keys_handed_rooms ?? [],
          notes: existingCheckin.notes ?? "",
        },
      };
    }

    return {
      ok: true,
      booking: mappedBooking,
      settings,
      hasExistingCheckin: progress.isComplete,
      checkedInRooms,
      roomCheckinComplete: progress.isComplete,
      partialPayment: existingCheckin
        ? {
            paymentStatus: existingCheckin.payment_status as PaymentStatus,
            paymentAmountPaid: Number(existingCheckin.payment_amount_paid ?? 0),
            depositAmount: Number(existingCheckin.deposit_amount ?? 0),
          }
        : undefined,
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

export async function loadBookingCheckinPaymentPanelAction(
  bookingId: string,
): Promise<
  | { ok: true; data: BookingCheckinPaymentPanelData }
  | { ok: false; error: string }
> {
  await requireAdmin();

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

    return {
      ok: true,
      data: {
        checkinId: checkin.id,
        bookingId: booking.id,
        guestName: booking.guest_name,
        plannedCheckIn: booking.check_in,
        plannedCheckOut: booking.check_out,
        totalPrice: booking.total_price ?? 0,
        paymentStatus: checkin.payment_status,
        paymentAmountPaid: Number(checkin.payment_amount_paid ?? 0),
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
  await requireAdmin();

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

    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateTag(CACHE_TAGS.checkins, "max");
    revalidateBookingDetailSurfaces(bookingId, tenantId);

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

function mapCreateCheckinError(
  err: unknown,
  t: Awaited<ReturnType<typeof getTranslations<"admin.checkIn">>>,
): { ok: false; error: string } | { ok: false; needsTransfer: true; transferOffer: CheckinTransferOffer } {
  const msg = err instanceof Error ? err.message : "Unknown error";
  if (isCheckinMigrationMissing(msg)) {
    return { ok: false, error: t("migrationRequired") };
  }
  const transferOffer = decodeCheckinTransferRequired(msg);
  if (transferOffer) {
    return { ok: false, needsTransfer: true, transferOffer };
  }
  if (msg.startsWith("checkin.blocked:")) {
    return { ok: false, error: msg.replace("checkin.blocked: ", "") };
  }
  return { ok: false, error: msg };
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

    let keys_handed_rooms: string[] = [];
    try {
      const keysJson = String(formData.get("keys_handed_rooms") ?? "[]");
      const parsed = JSON.parse(keysJson);
      keys_handed_rooms = Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === "string")
        : [];
    } catch {
      keys_handed_rooms = [];
    }

    const transferBookingToGuestId =
      String(formData.get("transfer_booking_to_guest_id") ?? "").trim() ||
      undefined;

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
      keys_handed_rooms,
      notes,
      identity_scope,
      reception_rooms,
      transfer_booking_to_guest_id: transferBookingToGuestId,
    };

    const checkinId = await createCheckin(checkinData, settings, bookingForCheckin);

    // Revalidate
    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateTag(CACHE_TAGS.checkins, "max");
    revalidateBookingDetailSurfaces(bookingId, tenantId);

    return { ok: true, checkinId };
  } catch (err) {
    const t = await getTranslations("admin.checkIn");
    return mapCreateCheckinError(err, t);
  }
}

export async function updateCheckinAction(
  formData: FormData,
): Promise<CreateCheckinResult> {
  await requireAdmin();

  try {
    const checkinId = String(formData.get("checkin_id") ?? "");
    const bookingId = String(formData.get("booking_id") ?? "");
    if (!checkinId) return { ok: false, error: "checkin_id required" };
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const type = (formData.get("type") as CheckinType) ?? "reservation";
    const paymentStatus =
      (formData.get("payment_status") as PaymentStatus) ?? "unpaid";
    const paymentAmountPaid = Number(formData.get("payment_amount_paid")) || 0;
    const depositAmount = Number(formData.get("deposit_amount")) || 0;
    const keyHanded = formData.get("key_handed") === "true";
    const notes = String(formData.get("notes") ?? "").trim() || undefined;

    const guestsJson = String(formData.get("guests") ?? "[]");
    let guests: CheckinGuestInput[];
    try {
      guests = JSON.parse(guestsJson);
    } catch {
      return { ok: false, error: "Invalid guests data" };
    }

    if (!Array.isArray(guests) || guests.length === 0) {
      return { ok: false, error: "At least one guest required" };
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

    let keys_handed_rooms: string[] = [];
    try {
      const keysJson = String(formData.get("keys_handed_rooms") ?? "[]");
      const parsed = JSON.parse(keysJson);
      keys_handed_rooms = Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === "string")
        : [];
    } catch {
      keys_handed_rooms = [];
    }

    const transferBookingToGuestId =
      String(formData.get("transfer_booking_to_guest_id") ?? "").trim() ||
      undefined;

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const [checkedInRooms, registeredGuests] = await Promise.all([
      getCheckedInRoomsForBooking(bookingId).catch(() => [] as string[]),
      listRegisteredGuestsForCheckin(
        bookingId,
        booking.guest_id,
        booking.room_names,
      ).catch(() => []),
    ]);

    const bookingForCheckin = mapBookingToForCheckin({
      ...booking,
      checked_in_rooms: checkedInRooms,
      registered_guests: registeredGuests,
    });

    const settings = await getCheckinSettings();

    const checkinData: CheckinFormData = {
      type,
      booking_id: bookingId,
      guests,
      payment_status: paymentStatus,
      payment_amount_paid: paymentAmountPaid,
      deposit_amount: depositAmount,
      key_handed: keyHanded,
      keys_handed_rooms,
      notes,
      identity_scope,
      reception_rooms,
      transfer_booking_to_guest_id: transferBookingToGuestId,
    };

    await updateCheckin(checkinId, checkinData, settings, bookingForCheckin);

    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateTag(CACHE_TAGS.checkins, "max");
    revalidateBookingDetailSurfaces(bookingId, tenantId);

    return { ok: true, checkinId };
  } catch (err) {
    const t = await getTranslations("admin.checkIn");
    return mapCreateCheckinError(err, t);
  }
}

/**
 * Server action: update check-in settings (owner panel).
 */
export async function updateCheckinSettingsAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const t = await getTranslations("admin.serverActions");

  try {
    await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "auth.role_forbidden";
    if (msg === "auth.login_required") {
      return { ok: false, error: t("invalidUserOrPassword") };
    }
    if (msg === "auth.tenant_member_required" || msg === "auth.role_forbidden") {
      return { ok: false, error: t("roleForbidden") };
    }
    return { ok: false, error: msg };
  }

  try {
    const input: Record<string, unknown> = {};

    const fields = [
      "checkin_doc_rule",
      "checkin_phone_rule",
      "checkin_cnp_rule",
      "checkin_payment_rule",
      "group_checkin_mode",
      "checkin_key_rule",
      "checkin_ids_per_room",
      "fisa_property_address",
      "fisa_owner_cui",
      "fisa_tourism_license",
    ];
    const nullableTextFields = new Set([
      "fisa_property_address",
      "fisa_owner_cui",
      "fisa_tourism_license",
    ]);
    for (const f of fields) {
      const v = formData.get(f);
      if (v == null) continue;
      const text = String(v).trim();
      input[f] = nullableTextFields.has(f) ? text || null : text;
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
    revalidateTag(checkinSettingsCacheTag(tenantId), "max");

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (isCheckinMigrationMissing(msg)) {
      const t = await getTranslations("admin.checkIn");
      return { ok: false, error: t("migrationRequired") };
    }
    if (msg === "settings.pension_settings_missing") {
      const t = await getTranslations("admin.pages.settings.checkin");
      return { ok: false, error: t("saveMissingRow") };
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

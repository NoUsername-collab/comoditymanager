"use server";

import { revalidateTag } from "next/cache";
import { requireAnyStaff } from "@/lib/auth/require-admin";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  revalidateBookingOperativeSurfaces,
  revalidateBookingSurfacesExtended,
} from "@/lib/cache/revalidate-admin";
import { getTranslations } from "next-intl/server";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { createCheckin } from "@/services/checkin/create";
import { updateCheckin } from "@/services/checkin/update";
import { getCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "@/services/bookings";
import { patchBookingRowForCheckin } from "@/services/bookings/synthetic-gantt-row";
import { createServerTimer } from "@/lib/dev/server-timing";
import { listBookingPayments } from "@/services/booking-payments";
import { resolveCheckinPaymentFromLedger } from "@/domain/checkin/payment-panel";
import { signedLedgerAmount } from "@/domain/payments/ledger";
import type { PaymentEntry } from "@/domain/payments/types";
import type { StoredPaymentStatus } from "@/domain/checkin/types";
import { assertBookingPostCheckoutEditAllowed } from "@/services/bookings/post-checkout-guard";
import {
  getCheckinByBookingId,
  getCheckedInRoomsForBooking,
  getCheckinGuests,
} from "@/services/checkin/queries";
import { computeRoomCheckinProgress } from "@/domain/checkin/room-checkin-progress";
import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { mapPersistedCheckinGuestsToInput } from "@/domain/checkin/map-persisted-guests";
import type {
  CheckinFormData,
  PaymentStatus,
  CheckinType,
} from "@/domain/checkin/types";
import { parseCheckinGuestsJson } from "@/domain/checkin/guest-input-schema";
import { listRegisteredGuestsForCheckin } from "@/services/checkin/booking-guests";
import { syncBookingOperativeCheckInFromRecord } from "@/services/checkin/sync";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";
import { decodeCheckinTransferRequired } from "@/domain/checkin/identity-result";
import type {
  CheckinWizardContextResult,
  CreateCheckinResult,
} from "./types";

async function buildLedgerCollectedHint(
  payments: PaymentEntry[],
  totalPaid: number,
): Promise<string | undefined> {
  if (payments.length === 0 || totalPaid <= 0) return undefined;

  const positive = payments.filter((entry) => signedLedgerAmount(entry) > 0);
  if (positive.length === 0) return undefined;

  const t = await getTranslations("admin.checkIn");
  const tFinancial = await getTranslations("admin.financial");

  if (positive.length === 1) {
    const method = positive[0].method;
    return t("payment.ledgerCollectedHint", {
      amount: totalPaid,
      method: tFinancial(`method_${method}`),
    });
  }

  return t("payment.ledgerCollectedHintMultiple", {
    amount: totalPaid,
    count: positive.length,
  });
}

async function loadWizardPaymentDefaults(
  bookingId: string,
  totalDue: number,
  existingCheckin: {
    payment_status: StoredPaymentStatus;
    payment_amount_paid: number | null;
    deposit_amount: number | null;
  } | null,
) {
  const ledgerPayments = await listBookingPayments(bookingId);
  const resolved = resolveCheckinPaymentFromLedger(
    totalDue,
    existingCheckin
      ? {
          paymentStatus: existingCheckin.payment_status,
          paymentAmountPaid: Number(existingCheckin.payment_amount_paid ?? 0),
        }
      : null,
    ledgerPayments,
  );
  const ledgerCollectedHint = resolved.fromLedger
    ? await buildLedgerCollectedHint(ledgerPayments, resolved.paymentAmountPaid)
    : undefined;

  return {
    paymentStatus: resolved.paymentStatus as PaymentStatus,
    paymentAmountPaid: resolved.paymentAmountPaid,
    depositAmount: Number(existingCheckin?.deposit_amount ?? 0),
    ledgerCollectedHint,
  };
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

export async function loadCheckinWizardContextAction(
  bookingId: string,
  options?: { edit?: boolean },
): Promise<CheckinWizardContextResult> {
  await requireAnyStaff();

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
      revalidateBookingSurfacesExtended({ bookingId, tenantId, includeHistoric: true });
      booking = {
        ...booking,
        actual_check_in_at: existingCheckin.checked_in_at,
      };
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
        const t = await getTranslations("admin.pages.stays");
        return { ok: false, error: t("emitTouristSheetNoGuests") };
      }

      const paymentDefaults = await loadWizardPaymentDefaults(
        bookingId,
        booking.total_price ?? 0,
        existingCheckin,
      );

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
          paymentStatus: paymentDefaults.paymentStatus,
          paymentAmountPaid: paymentDefaults.paymentAmountPaid,
          depositAmount: paymentDefaults.depositAmount,
          keysHandedRooms: existingCheckin.keys_handed_rooms ?? [],
          notes: existingCheckin.notes ?? "",
        },
        partialPayment: paymentDefaults.ledgerCollectedHint
          ? {
              paymentStatus: paymentDefaults.paymentStatus,
              paymentAmountPaid: paymentDefaults.paymentAmountPaid,
              depositAmount: paymentDefaults.depositAmount,
              ledgerCollectedHint: paymentDefaults.ledgerCollectedHint,
            }
          : undefined,
      };
    }

    const paymentDefaults = await loadWizardPaymentDefaults(
      bookingId,
      booking.total_price ?? 0,
      existingCheckin,
    );

    return {
      ok: true,
      booking: mappedBooking,
      settings,
      hasExistingCheckin: progress.isComplete,
      checkedInRooms,
      roomCheckinComplete: progress.isComplete,
      partialPayment:
        paymentDefaults.paymentAmountPaid > 0 ||
        paymentDefaults.paymentStatus !== "unpaid" ||
        paymentDefaults.ledgerCollectedHint
          ? paymentDefaults
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

export async function createCheckinAction(
  formData: FormData,
): Promise<CreateCheckinResult> {
  const timer = createServerTimer("createCheckin");
  await requireAnyStaff();
  timer.mark("auth");

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

    const guestsJson = String(formData.get("guests") ?? "[]");
    const guestsParsed = parseCheckinGuestsJson(guestsJson);
    if (!guestsParsed.ok) {
      return { ok: false, error: "Invalid guests data" };
    }
    const guests = guestsParsed.guests;

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

    const [booking, settings] = await Promise.all([
      getBookingById(bookingId),
      getCheckinSettings(),
    ]);
    timer.mark("loadContext");
    if (!booking) return { ok: false, error: "Booking not found" };

    const bookingForCheckin = mapBookingToForCheckin(booking);

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
    timer.mark("createCheckin");

    const tenantId = await resolveTenantIdForData();
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    revalidateBookingOperativeSurfaces(bookingId, tenantId);

    const ganttBooking = patchBookingRowForCheckin(booking, {
      checkedInAt: new Date().toISOString(),
      checkedInRooms: reception_rooms,
      keysHandedRooms: keys_handed_rooms,
      paymentStatus: paymentStatus as StoredPaymentStatus,
    });
    timer.finish({ bookingId, checkinId });
    return { ok: true, checkinId, ganttBooking };
  } catch (err) {
    timer.finish({ error: true });
    const t = await getTranslations("admin.checkIn");
    return mapCreateCheckinError(err, t);
  }
}

export async function updateCheckinAction(
  formData: FormData,
): Promise<CreateCheckinResult> {
  await requireAnyStaff();

  try {
    const checkinId = String(formData.get("checkin_id") ?? "");
    const bookingId = String(formData.get("booking_id") ?? "");
    if (!checkinId) return { ok: false, error: "checkin_id required" };
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };
    await assertBookingPostCheckoutEditAllowed(booking);

    const type = (formData.get("type") as CheckinType) ?? "reservation";
    const paymentStatus =
      (formData.get("payment_status") as PaymentStatus) ?? "unpaid";
    const paymentAmountPaid = Number(formData.get("payment_amount_paid")) || 0;
    const depositAmount = Number(formData.get("deposit_amount")) || 0;
    const keyHanded = formData.get("key_handed") === "true";
    const notes = String(formData.get("notes") ?? "").trim() || undefined;

    const guestsJson = String(formData.get("guests") ?? "[]");
    const guestsParsed = parseCheckinGuestsJson(guestsJson);
    if (!guestsParsed.ok) {
      return { ok: false, error: "Invalid guests data" };
    }
    const guests = guestsParsed.guests;

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
    revalidateBookingOperativeSurfaces(bookingId, tenantId);

    const ganttBooking = patchBookingRowForCheckin(booking, {
      checkedInAt: booking.actual_check_in_at ?? new Date().toISOString(),
      checkedInRooms: reception_rooms,
      keysHandedRooms: keys_handed_rooms,
      paymentStatus: paymentStatus as StoredPaymentStatus,
    });
    return { ok: true, checkinId, ganttBooking };
  } catch (err) {
    const t = await getTranslations("admin.checkIn");
    return mapCreateCheckinError(err, t);
  }
}

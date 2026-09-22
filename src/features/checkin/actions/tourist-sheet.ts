"use server";

import { requireAnyStaff } from "@/lib/auth/require-admin";
import { getTranslations } from "next-intl/server";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
import { getCheckinSettings } from "@/services/checkin/settings";
import { getBookingById } from "@/services/bookings";
import {
  getCheckinByBookingId,
  getCheckinGuests,
} from "@/services/checkin/queries";
import { buildTouristSheetFromPersisted } from "@/domain/checkin/tourist-sheet";
import { mapBookingToForCheckin } from "@/domain/checkin/map-booking";
import { mapPersistedCheckinGuestsToInput } from "@/domain/checkin/map-persisted-guests";
import type { LoadTouristSheetResult } from "./types";

export async function loadTouristSheetAction(
  bookingId: string,
): Promise<LoadTouristSheetResult> {
  await requireAnyStaff();

  try {
    if (!bookingId) return { ok: false, error: "booking_id required" };

    const booking = await getBookingById(bookingId);
    if (!booking) return { ok: false, error: "Booking not found" };

    const checkin = await getCheckinByBookingId(bookingId);
    if (!checkin) {
      const t = await getTranslations("admin.pages.stays");
      return {
        ok: false,
        error: booking.actual_check_in_at
          ? t("emitTouristSheetLegacyCheckin")
          : t("emitTouristSheetNoCheckin"),
      };
    }

    const [guestRows, settings] = await Promise.all([
      getCheckinGuests(checkin.id),
      getCheckinSettings(),
    ]);

    if (!guestRows.length) {
      const t = await getTranslations("admin.pages.stays");
      return { ok: false, error: t("emitTouristSheetNoGuests") };
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

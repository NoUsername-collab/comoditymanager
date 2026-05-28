"use server";

import { revalidatePath } from "next/cache";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { requireAdmin } from "@/lib/auth/require-admin";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import {
  createGuestRebookStay,
  loadGuestRebookDraft,
  previewGuestRebookRooms,
} from "@/services/guest-rebook";
import { getTranslations } from "next-intl/server";

function revalidateAfterRebook(guestId: string, bookingId: string) {
  revalidatePath("/admin/guests");
  revalidatePath(`/admin/guests/${guestId}`);
  revalidatePath(`/admin/guests/${guestId}/rebook`);
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/cazari");
  revalidatePath("/admin/calendar");
}

export async function loadGuestRebookPanelAction(
  guestId: string,
  sourceBookingId: string
) {
  await requireAdmin();
  try {
    const draft = await loadGuestRebookDraft(guestId, sourceBookingId);
    const rooms = await previewGuestRebookRooms({
      checkIn: draft.checkIn,
      checkOut: draft.checkOut,
      numAdults: draft.numAdults,
      numChildren: draft.numChildren,
    });
    return {
      ok: true as const,
      data: {
        draft,
        initialRooms: rooms.availableRooms,
        initialCanFulfill: rooms.canFulfill,
        initialMinRooms: rooms.minRoomsNeeded,
        checkInTime: rooms.checkInTime,
        checkOutTime: rooms.checkOutTime,
      },
    };
  } catch {
    return { ok: false as const };
  }
}

export async function previewGuestRebookRoomsAction(input: {
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
}) {
  await requireAdmin();
  if (!input.check_in || !input.check_out || input.check_out <= input.check_in) {
    return { ok: false as const, error: "errors.pickDates" };
  }
  const rooms = await previewGuestRebookRooms({
    checkIn: input.check_in,
    checkOut: input.check_out,
    numAdults: Math.max(1, input.num_adults),
    numChildren: Math.max(0, input.num_children),
  });
  return { ok: true as const, rooms };
}

export async function submitGuestRebookStayAction(formData: FormData) {
  await requireAdmin();
  const t = await getTranslations("admin.serverActions");

  const guestId = String(formData.get("guest_id") ?? "");
  const sourceBookingId = String(formData.get("source_booking_id") ?? "");
  if (!guestId || !sourceBookingId) throw new Error(t("invalidGuest"));

  const guestPhone = String(formData.get("guest_phone") ?? "").trim();
  try {
    assertValidGuestPhone(guestPhone);
  } catch {
    throw new Error("errors.phoneRequired");
  }

  const roomIds = formData.getAll("room_ids").map(String).filter(Boolean);
  const hasMinor = formData.get("has_minor") === "on";

  const bookingId = await createGuestRebookStay({
    guestId,
    sourceBookingId,
    checkIn: String(formData.get("check_in") ?? ""),
    checkOut: String(formData.get("check_out") ?? ""),
    guestLastName: String(formData.get("guest_last_name") ?? ""),
    guestFirstName: String(formData.get("guest_first_name") ?? ""),
    guestEmail: String(formData.get("guest_email") ?? ""),
    guestPhone,
    numAdults: Math.max(1, Number(formData.get("num_adults") ?? 1)),
    numChildren: Math.max(0, Number(formData.get("num_children") ?? 0)),
    hasMinor,
    minorAge: hasMinor ? String(formData.get("minor_age") ?? "") : "",
    notes: String(formData.get("notes") ?? ""),
    roomIds,
  });

  revalidateAfterRebook(guestId, bookingId);
  await redirect(`/admin/bookings/${bookingId}?toast=rebooked`);
}

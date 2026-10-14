"use server";

import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { parsePartyInput, type Party } from "@/domain/availability/party";
import { assertValidGuestPhone, staffBookingEmail } from "@/domain/guest/normalize";
import type { BookingOccupantDraft } from "@/domain/booking/occupants";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import {
  requireAnyStaff,
  requireStaffPermission,
} from "@/lib/auth/require-admin";
import { revalidateBookingSurfacesExtended } from "@/lib/cache/revalidate-admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { createServerTimer } from "@/lib/dev/server-timing";
import {
  confirmBookingWithRooms,
  createBookingRequest,
} from "@/services/bookings";
import {
  loadAvailableRoomsForStay,
  type StayRoomsAvailability,
} from "@/services/booking-confirm";
import { getStayPricingRules } from "@/services/booking-rules-settings";
import { quoteStayForRooms } from "@/services/stay-quote";
import { getRoomsByIds } from "@/services/rooms-admin";
import { buildSyntheticGanttBookingRow } from "@/services/bookings/synthetic-gantt-row";
import type { BookingRow } from "@/services/bookings/types";
import { getTranslations } from "next-intl/server";

export type StaffStayIntent = "request" | "direct";

export type StaffStayOccupantInput = {
  roomId: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
};

export type StaffStayCreateInput = {
  intent: StaffStayIntent;
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone?: string;
  party: Party;
  notes?: string;
  occupants?: StaffStayOccupantInput[];
  skipAvailabilityCheck?: boolean;
  source?: "gantt" | "reception";
};

type ActionOk = { ok: true; id: string; booking?: BookingRow };
type ActionErr = { ok: false; error: string };

function uniqueRoomIds(roomIds: string[]): string[] {
  return [...new Set(roomIds.map((id) => id.trim()).filter(Boolean))];
}

function validateIdentity(
  input: {
    guestLastName: string;
    guestFirstName: string;
    guestEmail: string;
    guestPhone?: string;
  },
  t: Awaited<ReturnType<typeof getTranslations>>,
): ActionErr | { last: string; first: string; email: string; phone: string } {
  const last = input.guestLastName.trim();
  const first = input.guestFirstName.trim();
  const email = staffBookingEmail(input.guestEmail);
  if (!last || !first || !input.guestPhone?.trim()) {
    return { ok: false, error: t("nameEmailPhoneRequired") };
  }
  try {
    assertValidGuestPhone(input.guestPhone);
  } catch {
    return { ok: false, error: t("invalidPhone") };
  }
  return { last, first, email, phone: input.guestPhone.trim() };
}

export async function previewStaffStayRoomsAction(input: {
  checkIn: string;
  checkOut: string;
  party: Party;
}): Promise<
  | {
      ok: true;
      rooms: StayRoomsAvailability;
      pricingRules: StayPricingRules;
    }
  | ActionErr
> {
  const t = await getTranslations("admin.serverActions");
  await requireAnyStaff();
  if (!input.checkIn || !input.checkOut || !isAtLeastOneNight(input.checkIn, input.checkOut)) {
    return { ok: false, error: t("previewError") };
  }
  const party = parsePartyInput(input.party);
  if (!party) return { ok: false, error: t("childAgesRequired") };
  try {
    const [rooms, pricingRules] = await Promise.all([
      loadAvailableRoomsForStay({
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        party,
      }),
      getStayPricingRules(),
    ]);
    return { ok: true, rooms, pricingRules };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : t("previewError"),
    };
  }
}

export async function createStaffStayAction(
  input: StaffStayCreateInput,
): Promise<ActionOk | ActionErr> {
  const timer = createServerTimer(
    input.intent === "direct" ? "staff-stay-direct" : "staff-stay-request",
  );
  const t = await getTranslations("admin.serverActions");
  if (input.intent === "direct") {
    await requireStaffPermission("booking_management");
  } else {
    await requireAnyStaff();
  }
  timer.mark("auth");

  try {
    if (!isAtLeastOneNight(input.checkIn, input.checkOut)) {
      return { ok: false, error: t("requestError") };
    }
    const titular = validateIdentity(input, t);
    if ("ok" in titular) return titular;

    const roomIds = uniqueRoomIds(input.roomIds);
    if (roomIds.length === 0) {
      return { ok: false, error: t("selectRoomsRequired") };
    }

    const occupantDrafts: BookingOccupantDraft[] = [];
    if (input.occupants && input.occupants.length > 0) {
      for (const [index, occupant] of input.occupants.entries()) {
        const parsed = validateIdentity(occupant, t);
        if ("ok" in parsed) return parsed;
        occupantDrafts.push({
          roomId: occupant.roomId,
          guestLastName: parsed.last,
          guestFirstName: parsed.first,
          guestEmail: parsed.email,
          guestPhone: parsed.phone,
          isRepresentative: index === 0,
        });
      }
    }

    const party = parsePartyInput(input.party);
    if (!party) return { ok: false, error: t("childAgesRequired") };

    const rooms = await getRoomsByIds(roomIds);
    if (rooms.length !== roomIds.length) {
      return { ok: false, error: t("roomNotFound") };
    }
    let total: number;
    try {
      ({ total } = await quoteStayForRooms({
        party,
        roomIds,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      }));
    } catch {
      return { ok: false, error: t("roomsCannotHostGuests") };
    }

    const defaultNote =
      input.source === "reception"
        ? t("createdFromReceptionNote")
        : input.intent === "direct"
          ? t("directStayFromGanttNote")
          : t("createdFromGanttNote");
    const notes = input.notes?.trim() || defaultNote;

    const bookingId = await createBookingRequest({
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_name: `${titular.last} ${titular.first}`.trim(),
      guest_last_name: titular.last,
      guest_first_name: titular.first,
      guest_email: titular.email,
      guest_phone: titular.phone,
      party,
      notes,
      total_price: total,
      room_ids: roomIds,
      skipAvailabilityCheck: input.skipAvailabilityCheck === true,
      deferGuestLink: true,
      occupants: occupantDrafts.length > 0 ? occupantDrafts : undefined,
    });
    timer.mark("create");

    if (input.intent === "direct") {
      await confirmBookingWithRooms(bookingId, roomIds, total, {
        assignedRoomsOnly: true,
      });
      timer.mark("confirm");
    }

    const tenantId = await resolveTenantIdForData();
    revalidateBookingSurfacesExtended({
      tenantId,
      includeCalendar: false,
    });

    const booking = buildSyntheticGanttBookingRow({
      id: bookingId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: input.intent === "direct" ? "confirmata" : "cerere_noua",
      guestLastName: titular.last,
      guestFirstName: titular.first,
      guestEmail: titular.email,
      guestPhone: titular.phone,
      roomId: roomIds[0],
      roomIds,
      roomName: rooms[0]?.name,
      roomNames: rooms.map((room) => room.name),
      numAdults: party.adults,
      numChildren: party.childAges.length,
      totalPrice: total,
    });
    timer.finish({ bookingId });
    return { ok: true, id: bookingId, booking };
  } catch (e) {
    timer.finish({ error: true });
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : input.intent === "direct"
            ? t("directStayError")
            : t("requestError"),
    };
  }
}

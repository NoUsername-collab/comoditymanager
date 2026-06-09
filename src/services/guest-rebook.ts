import { cache } from "react";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import {
  assertRoomsAvailableForStay,
  createBookingRequest,
  getBookingById,
} from "@/services/bookings";
import {
  canRoomsHostGuests,
  minRoomsToHostGuests,
} from "@/domain/availability/stay-capacity";
import {
  loadAvailableRoomsForStay,
  type ConfirmRoomOption,
  type StayRoomsAvailability,
} from "@/services/booking-confirm";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import { getGuestBaseById } from "@/services/guests";
import { logAdminActivityFromSession } from "@/services/activity-log";

export type GuestRebookDraft = {
  guestId: string;
  sourceBookingId: string;
  sourceCheckIn: string;
  sourceCheckOut: string;
  guestDisplayName: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numChildren: number;
  hasMinor: boolean;
  minorAge: string;
  notes: string;
  defaultRoomIds: string[];
};

export type GuestRebookPanelPayload = {
  draft: GuestRebookDraft;
  initialRooms: ConfirmRoomOption[];
  initialCanFulfill: boolean;
  initialMinRooms: number;
  checkInTime: string;
  checkOutTime: string;
};

const loadGuestRebookDraftCached = cache(async (
  guestId: string,
  sourceBookingId: string
): Promise<GuestRebookDraft> => {
  const [guest, booking] = await Promise.all([
    getGuestBaseById(guestId),
    getBookingById(sourceBookingId),
  ]);
  if (!guest) throw new Error("guest.not_found");
  if (!booking) throw new Error("booking.not_found");
  if (booking.guest_id && booking.guest_id !== guestId) {
    throw new Error("guest.rebook_booking_mismatch");
  }

  const defaultNotes = `[Rebook] Din sejur ${booking.check_in} → ${booking.check_out}`;

  return {
    guestId,
    sourceBookingId,
    sourceCheckIn: booking.check_in,
    sourceCheckOut: booking.check_out,
    guestDisplayName: guest.display_name,
    guestLastName: guest.last_name,
    guestFirstName: guest.first_name,
    guestEmail: guest.email ?? booking.guest_email,
    guestPhone: guest.phone ?? booking.guest_phone ?? "",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    numAdults: booking.num_adults,
    numChildren: booking.num_children,
    hasMinor: booking.has_minor,
    minorAge: booking.minor_age ?? "",
    notes: defaultNotes,
    defaultRoomIds: booking.room_ids,
  };
});

export async function loadGuestRebookDraft(
  guestId: string,
  sourceBookingId: string
): Promise<GuestRebookDraft> {
  return loadGuestRebookDraftCached(guestId, sourceBookingId);
}

const loadPreviewGuestRebookRoomsCached = cache(async (
  checkIn: string,
  checkOut: string,
  numAdults: number,
  numChildren: number
): Promise<StayRoomsAvailability> => {
  const guestCount = Math.max(1, numAdults + numChildren);
  return loadAvailableRoomsForStay({
    checkIn,
    checkOut,
    guestCount,
  });
});

export async function previewGuestRebookRooms(input: {
  checkIn: string;
  checkOut: string;
  numAdults: number;
  numChildren: number;
}): Promise<StayRoomsAvailability> {
  return loadPreviewGuestRebookRoomsCached(
    input.checkIn,
    input.checkOut,
    input.numAdults,
    input.numChildren
  );
}

const loadGuestRebookPanelPayloadCached = cache(async (
  guestId: string,
  sourceBookingId: string
): Promise<GuestRebookPanelPayload> => {
  const draftPromise = loadGuestRebookDraftCached(guestId, sourceBookingId);
  const roomsPromise = draftPromise.then((draft) =>
    loadPreviewGuestRebookRoomsCached(
      draft.checkIn,
      draft.checkOut,
      draft.numAdults,
      draft.numChildren
    )
  );
  const [draft, rooms] = await Promise.all([draftPromise, roomsPromise]);
  return {
    draft,
    initialRooms: rooms.availableRooms,
    initialCanFulfill: rooms.canFulfill,
    initialMinRooms: rooms.minRoomsNeeded,
    checkInTime: rooms.checkInTime,
    checkOutTime: rooms.checkOutTime,
  };
});

export async function loadGuestRebookPanelPayload(
  guestId: string,
  sourceBookingId: string
): Promise<GuestRebookPanelPayload> {
  return loadGuestRebookPanelPayloadCached(guestId, sourceBookingId);
}

function resolveSelectedRooms(
  roomIds: string[],
  availableRooms: ConfirmRoomOption[]
): ConfirmRoomOption[] {
  const idSet = new Set(roomIds);
  return availableRooms.filter((r) => idSet.has(r.id));
}

export async function createGuestRebookStay(input: {
  guestId: string;
  sourceBookingId: string;
  checkIn: string;
  checkOut: string;
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  numAdults: number;
  numChildren: number;
  hasMinor: boolean;
  minorAge: string;
  notes: string;
  roomIds: string[];
}): Promise<string> {
  const guestName = `${input.guestLastName.trim()} ${input.guestFirstName.trim()}`.trim();
  const uniqueRooms = [...new Set(input.roomIds.filter(Boolean))];
  const previewPromise =
    uniqueRooms.length > 0
      ? previewGuestRebookRooms({
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          numAdults: input.numAdults,
          numChildren: input.numChildren,
        })
      : Promise.resolve(null);

  const [guest, source, availabilityPreview] = await Promise.all([
    getGuestBaseById(input.guestId),
    getBookingById(input.sourceBookingId),
    previewPromise,
  ]);
  if (!guest) throw new Error("guest.not_found");
  if (!source) throw new Error("booking.not_found");
  if (source.guest_id && source.guest_id !== input.guestId) {
    throw new Error("guest.rebook_booking_mismatch");
  }

  assertValidGuestPhone(input.guestPhone);

  let total: number | null = null;

  if (uniqueRooms.length > 0 && availabilityPreview) {
    const availability = availabilityPreview;
    const selected = resolveSelectedRooms(uniqueRooms, availability.availableRooms);
    if (selected.length !== uniqueRooms.length) {
      throw new Error("booking.one_or_more_rooms_unavailable_reload");
    }
    const guestCount = input.numAdults + input.numChildren;
    if (!canRoomsHostGuests(guestCount, selected)) {
      throw new Error("booking.selected_rooms_cannot_host_all_guests");
    }
    const { possible } = minRoomsToHostGuests(guestCount, availability.availableRooms);
    if (!possible) {
      throw new Error("booking.one_or_more_rooms_unavailable_reload");
    }
    await assertRoomsAvailableForStay(input.checkIn, input.checkOut, uniqueRooms);
    total = computeStandardStayTotal(selected, input.checkIn, input.checkOut);
  }

  const bookingId = await createBookingRequest({
    check_in: input.checkIn,
    check_out: input.checkOut,
    guest_name: guestName || guest.display_name,
    guest_last_name: input.guestLastName.trim(),
    guest_first_name: input.guestFirstName.trim(),
    guest_email: input.guestEmail.trim(),
    guest_phone: input.guestPhone.trim(),
    num_adults: input.numAdults,
    num_children: input.numChildren,
    has_minor: input.hasMinor,
    minor_age: input.minorAge,
    notes: input.notes.trim(),
    total_price: total,
    room_ids: uniqueRooms.length > 0 ? uniqueRooms : undefined,
  });

  await logAdminActivityFromSession({
    action: "booking.rebooked",
    entityType: "booking",
    entityId: bookingId,
    summary: `Rebook editabil: ${guestName || guest.display_name}`,
    metadata: {
      guest_id: input.guestId,
      source_booking_id: input.sourceBookingId,
    },
  });

  return bookingId;
}

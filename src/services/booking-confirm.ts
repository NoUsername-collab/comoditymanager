import { cache } from "react";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { isRoomFreeForStay } from "@/domain/availability/rooms-free";
import {
  canRoomsHostGuests,
  minRoomsToHostGuests,
  roomMaxCapacity,
} from "@/domain/availability/stay-capacity";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";
import {
  getBookingById,
  getBookingStayParams,
  listOccupiedRoomRanges,
} from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { getStayPricingRules } from "@/services/booking-rules-settings";
import { listAllRooms } from "@/services/rooms-admin";

import { getRoomOptionSlugsByRoomIds } from "@/services/room-catalog";

export type ConfirmRoomOption = {
  id: string;
  name: string;
  building_name: string;
  has_ac: boolean;
  room_type_name: string | null;
  option_slugs: string[];
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  max_capacity: number;
  price_per_night: number;
};

/** Preț înregistrat la confirmare — mereu total standard (+ supliment opțional). */
export async function resolveTotalPriceForConfirm(
  bookingId: string,
  roomIds: string[],
  formData: FormData
): Promise<number> {
  const ctx = await loadBookingConfirmContext(bookingId);
  if (!ctx) throw new Error("booking.request_not_found");

  const pricingRules = await getStayPricingRules();

  const idSet = new Set(roomIds);
  const selected = ctx.availableRooms.filter((r) => idSet.has(r.id));
  const standard = computeStandardStayTotal(
    selected,
    ctx.booking.check_in,
    ctx.booking.check_out,
    pricingRules
  );

  if (!Number.isFinite(standard) || standard <= 0) {
    throw new Error("booking.calculated_price_invalid_check_room_prices");
  }

  if (formData.get("modify_price") !== "on") {
    return standard;
  }

  const adjustment = Number(formData.get("price_adjustment") ?? 0);
  if (!Number.isFinite(adjustment)) {
    throw new Error("booking.enter_valid_adjustment_ron");
  }

  return Math.round((standard + adjustment) * 100) / 100;
}

export type BookingConfirmContext = {
  booking: NonNullable<Awaited<ReturnType<typeof getBookingById>>>;
  checkInTime: string;
  checkOutTime: string;
  guestCount: number;
  availableRooms: ConfirmRoomOption[];
  minRoomsNeeded: number;
  canFulfill: boolean;
};

export type StayRoomsAvailability = {
  checkInTime: string;
  checkOutTime: string;
  guestCount: number;
  availableRooms: ConfirmRoomOption[];
  minRoomsNeeded: number;
  canFulfill: boolean;
};

const loadAvailableRoomsForStayCached = cache(async (
  checkIn: string,
  checkOut: string,
  guestCount: number,
  excludeBookingId: string | undefined
): Promise<StayRoomsAvailability> => {
  const roomsPromise = listAllRooms();
  const [settings, occupied, allRooms, optionSlugsByRoom] = await Promise.all([
    getPensionSettings().catch(() => null),
    listOccupiedRoomRanges(excludeBookingId, {
      rangeStart: checkIn,
      rangeEnd: checkOut,
    }),
    roomsPromise,
    roomsPromise
      .then((rooms) =>
        getRoomOptionSlugsByRoomIds(
          rooms.filter((r) => r.is_active).map((r) => r.id)
        )
      )
      .catch(() => ({} as Record<string, string[]>)),
  ]);
  const checkInTime =
    settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
  const checkOutTime =
    settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

  const activeRooms = allRooms.filter((r) => r.is_active);

  const availableRooms: ConfirmRoomOption[] = activeRooms
    .filter((r) =>
      isRoomFreeForStay(
        r.id,
        checkIn,
        checkOut,
        occupied,
        checkInTime,
        checkOutTime
      )
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      building_name: r.building_name,
      has_ac: r.has_ac,
      room_type_name: r.room_type_name,
      option_slugs: optionSlugsByRoom[r.id] ?? [],
      capacity_base: r.capacity_base,
      allows_extra_beds: r.allows_extra_beds,
      max_extra_beds_per_room: r.max_extra_beds_per_room,
      max_capacity: roomMaxCapacity(r),
      price_per_night: r.price_per_night,
    }));

  const { possible, minRooms } = minRoomsToHostGuests(
    guestCount,
    availableRooms
  );

  return {
    checkInTime,
    checkOutTime,
    guestCount,
    availableRooms,
    minRoomsNeeded: minRooms,
    canFulfill: possible,
  };
});

/** Camere libere pentru un interval (fără rezervare existentă). */
export async function loadAvailableRoomsForStay(input: {
  checkIn: string;
  checkOut: string;
  guestCount: number;
  excludeBookingId?: string;
}): Promise<StayRoomsAvailability> {
  return loadAvailableRoomsForStayCached(
    input.checkIn,
    input.checkOut,
    input.guestCount,
    input.excludeBookingId
  );
}

const loadBookingConfirmContextCached = cache(async (
  bookingId: string
): Promise<BookingConfirmContext | null> => {
  const paramsPromise = getBookingStayParams(bookingId);
  const roomsPromise = paramsPromise.then((params) =>
    params
      ? loadAvailableRoomsForStayCached(
          params.check_in,
          params.check_out,
          params.num_adults + params.num_children,
          bookingId
        )
      : null
  );
  const [booking, rooms] = await Promise.all([
    getBookingById(bookingId),
    roomsPromise,
  ]);
  if (!booking || !rooms) return null;

  const guestCount = booking.num_adults + booking.num_children;

  return {
    booking,
    checkInTime: rooms.checkInTime,
    checkOutTime: rooms.checkOutTime,
    guestCount,
    availableRooms: rooms.availableRooms,
    minRoomsNeeded: rooms.minRoomsNeeded,
    canFulfill: rooms.canFulfill,
  };
});

export async function loadBookingConfirmContext(
  bookingId: string
): Promise<BookingConfirmContext | null> {
  return loadBookingConfirmContextCached(bookingId);
}

/** Verifică înainte de confirmare: camere libere + capacitate pentru oaspeți. */
export async function assertRoomsAssignableForBooking(
  bookingId: string,
  roomIds: string[]
): Promise<void> {
  const ctx = await loadBookingConfirmContext(bookingId);
  if (!ctx) throw new Error("booking.request_not_found");

  if (roomIds.length === 0) {
    throw new Error("booking.select_at_least_one_room");
  }

  const idSet = new Set(roomIds);
  const selected = ctx.availableRooms.filter((r) => idSet.has(r.id));

  if (selected.length !== roomIds.length) {
    throw new Error("booking.one_or_more_rooms_unavailable_reload");
  }

  if (!canRoomsHostGuests(ctx.guestCount, selected)) {
    throw new Error("booking.selected_rooms_cannot_host_all_guests");
  }
}

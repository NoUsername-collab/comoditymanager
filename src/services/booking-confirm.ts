import { cache } from "react";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";
import { isRoomFreeForStay } from "@/domain/availability/rooms-free";
import {
  minRoomsToHostParty,
  roomMaxCapacity,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";
import {
  partyFromBooking,
  partyHeadcount,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";
import {
  getBookingById,
  getBookingStayParams,
  listOccupiedRoomRanges,
} from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import {
  toStayPricingRules,
  type StayPricingRules,
} from "@/domain/settings/booking-rules";
import { getFreeStockForStay } from "@/services/stay-inventory";
import { quoteStayForRooms } from "@/services/stay-quote";
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
  max_cots: number;
  max_occupancy: number | null;
  max_capacity: number;
  price_per_night: number;
};

/** Gantt / already-assigned rooms — skip the full hotel availability catalog. */
export async function resolveAssignedStayTotal(booking: {
  id: string;
  check_in: string;
  check_out: string;
  room_ids: string[];
  num_adults: number;
  num_children: number;
  children_ages?: number[] | null;
  children_separate_room?: boolean | null;
}): Promise<number> {
  const quote = await quoteStayForRooms({
    party: partyFromBooking(booking),
    roomIds: booking.room_ids,
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    excludeBookingId: booking.id,
  });
  if (!Number.isFinite(quote.total) || quote.total <= 0) {
    throw new Error("booking.calculated_price_invalid_check_room_prices");
  }
  return quote.total;
}

/** Preț înregistrat la confirmare — mereu total standard (+ supliment opțional). */
export async function resolveTotalPriceForConfirm(
  bookingId: string,
  roomIds: string[],
  formData: FormData
): Promise<number> {
  if (roomIds.length === 0) {
    throw new Error("booking.select_at_least_one_room");
  }

  const params = await getBookingStayParams(bookingId);
  if (!params) throw new Error("booking.request_not_found");

  // Rooms plus extra beds and cots: the same total the guest saw.
  const { total: standard } = await quoteStayForRooms({
    party: partyFromBooking(params),
    roomIds,
    checkIn: params.check_in,
    checkOut: params.check_out,
    excludeBookingId: bookingId,
  });

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

type BookingConfirmContext = {
  booking: NonNullable<Awaited<ReturnType<typeof getBookingById>>>;
  checkInTime: string;
  checkOutTime: string;
  guestCount: number;
  party: Party;
  childPolicy: ChildPolicy;
  inventory: SharedInventory;
  availableRooms: ConfirmRoomOption[];
  minRoomsNeeded: number;
  canFulfill: boolean;
};

export type StayRoomsAvailability = {
  checkInTime: string;
  checkOutTime: string;
  guestCount: number;
  party: Party;
  childPolicy: ChildPolicy;
  /** Extra beds and baby cots still free on these dates. */
  inventory: SharedInventory;
  /** Weekend, seasons and extra-bed / cot fees — so every screen prices like the server. */
  pricingRules: StayPricingRules;
  availableRooms: ConfirmRoomOption[];
  minRoomsNeeded: number;
  canFulfill: boolean;
};

const loadAvailableRoomsForStayCached = cache(async (
  checkIn: string,
  checkOut: string,
  partyKey: string,
  excludeBookingId: string | undefined
): Promise<StayRoomsAvailability> => {
  const party = JSON.parse(partyKey) as Party;
  const roomsPromise = listAllRooms();
  const [settings, rules, occupied, allRooms, optionSlugsByRoom] = await Promise.all([
    getPensionSettings().catch(() => null),
    getBookingRulesSettings(),
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
  const childPolicy = rules.childPolicy;
  const inventory = await getFreeStockForStay({
    checkIn,
    checkOut,
    policy: childPolicy,
    excludeBookingId,
  });
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
      max_cots: r.max_cots,
      max_occupancy: r.max_occupancy,
      max_capacity: roomMaxCapacity(r),
      price_per_night: r.price_per_night,
    }));

  const { possible, minRooms } = minRoomsToHostParty(
    party,
    availableRooms,
    childPolicy,
    inventory
  );

  return {
    checkInTime,
    checkOutTime,
    guestCount: partyHeadcount(party),
    party,
    childPolicy,
    inventory,
    pricingRules: toStayPricingRules(rules),
    availableRooms,
    minRoomsNeeded: minRooms,
    canFulfill: possible,
  };
});

/** Camere libere pentru un interval (fără rezervare existentă). */
export async function loadAvailableRoomsForStay(input: {
  checkIn: string;
  checkOut: string;
  party: Party;
  excludeBookingId?: string;
}): Promise<StayRoomsAvailability> {
  return loadAvailableRoomsForStayCached(
    input.checkIn,
    input.checkOut,
    JSON.stringify(input.party),
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
          JSON.stringify(partyFromBooking(params)),
          bookingId
        )
      : null
  );
  const [booking, rooms] = await Promise.all([
    getBookingById(bookingId),
    roomsPromise,
  ]);
  if (!booking || !rooms) return null;

  return {
    booking,
    checkInTime: rooms.checkInTime,
    checkOutTime: rooms.checkOutTime,
    guestCount: rooms.guestCount,
    party: rooms.party,
    childPolicy: rooms.childPolicy,
    inventory: rooms.inventory,
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

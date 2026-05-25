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
import { getBookingById, listOccupiedRoomRanges } from "@/services/bookings";
import { getPensionSettings } from "@/services/pension-settings";
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
  if (!ctx) throw new Error("Cererea nu există");

  const idSet = new Set(roomIds);
  const selected = ctx.availableRooms.filter((r) => idSet.has(r.id));
  const standard = computeStandardStayTotal(
    selected,
    ctx.booking.check_in,
    ctx.booking.check_out
  );

  if (!Number.isFinite(standard) || standard <= 0) {
    throw new Error("Prețul calculat este invalid — verifică prețurile camerelor");
  }

  if (formData.get("modify_price") !== "on") {
    return standard;
  }

  const adjustment = Number(formData.get("price_adjustment") ?? 0);
  if (!Number.isFinite(adjustment)) {
    throw new Error("Introdu un supliment valid (RON)");
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

export async function loadBookingConfirmContext(
  bookingId: string
): Promise<BookingConfirmContext | null> {
  const booking = await getBookingById(bookingId);
  if (!booking) return null;

  const settings = await getPensionSettings().catch(() => null);
  const checkInTime =
    settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
  const checkOutTime =
    settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

  const occupied = await listOccupiedRoomRanges(bookingId);
  const activeRooms = (await listAllRooms()).filter((r) => r.is_active);
  const optionSlugsByRoom = await getRoomOptionSlugsByRoomIds(
    activeRooms.map((r) => r.id)
  ).catch(() => ({} as Record<string, string[]>));

  const availableRooms: ConfirmRoomOption[] = activeRooms
    .filter((r) =>
      isRoomFreeForStay(
        r.id,
        booking.check_in,
        booking.check_out,
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

  const guestCount = booking.num_adults + booking.num_children;
  const { possible, minRooms } = minRoomsToHostGuests(
    guestCount,
    availableRooms
  );

  return {
    booking,
    checkInTime,
    checkOutTime,
    guestCount,
    availableRooms,
    minRoomsNeeded: minRooms,
    canFulfill: possible,
  };
}

/** Verifică înainte de confirmare: camere libere + capacitate pentru oaspeți. */
export async function assertRoomsAssignableForBooking(
  bookingId: string,
  roomIds: string[]
): Promise<void> {
  const ctx = await loadBookingConfirmContext(bookingId);
  if (!ctx) throw new Error("Cererea nu există");

  if (roomIds.length === 0) {
    throw new Error("Selectează cel puțin o cameră");
  }

  const idSet = new Set(roomIds);
  const selected = ctx.availableRooms.filter((r) => idSet.has(r.id));

  if (selected.length !== roomIds.length) {
    throw new Error(
      "Una sau mai multe camere nu mai sunt disponibile — reîncarcă pagina"
    );
  }

  if (!canRoomsHostGuests(ctx.guestCount, selected)) {
    throw new Error(
      "Camerele selectate nu pot găzdui toți oaspeții pentru această perioadă"
    );
  }
}

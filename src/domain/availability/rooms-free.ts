import { rangesOverlap, isAtLeastOneNight } from "@/domain/booking/conflict";

export type RoomForAvailability = {
  id: string;
  name: string;
  building_name: string;
  capacity_base: number;
  has_ac: boolean;
  allows_extra_beds: boolean;
};

export type ExistingBooking = {
  room_id: string;
  check_in: string;
  check_out: string;
};

/** Cameră liberă pe tot intervalul (fără suprapunere pe room_id) */
export function isRoomFreeForStay(
  roomId: string,
  checkIn: string,
  checkOut: string,
  bookings: ExistingBooking[],
  checkInTime?: string,
  checkOutTime?: string
): boolean {
  return !bookings.some(
    (b) =>
      b.room_id === roomId &&
      rangesOverlap(
        { checkIn, checkOut },
        { checkIn: b.check_in, checkOut: b.check_out },
        checkInTime,
        checkOutTime
      )
  );
}

export function countFreeRooms(
  rooms: RoomForAvailability[],
  checkIn: string,
  checkOut: string,
  bookings: ExistingBooking[],
  times?: { checkIn: string; checkOut: string }
): number {
  if (!isAtLeastOneNight(checkIn, checkOut)) return 0;
  return rooms.filter((r) =>
    isRoomFreeForStay(
      r.id,
      checkIn,
      checkOut,
      bookings,
      times?.checkIn,
      times?.checkOut
    )
  ).length;
}

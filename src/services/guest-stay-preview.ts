import { cache } from "react";
import { computeGuestStayOptions } from "@/domain/availability/guest-stay-options";
import type { GuestStayPreview } from "@/domain/availability/guest-stay-options";
import { listOccupiedRoomRanges } from "@/services/bookings";
import { listAllRoomsForPublic } from "@/services/rooms-admin";
import { getPensionSettings } from "@/services/pension-settings";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";

export const loadGuestStayPreview = cache(async (
  checkIn: string,
  checkOut: string,
  numAdults: number,
  numChildren: number
): Promise<GuestStayPreview> => {
  const guestCount = Math.max(1, numAdults + numChildren);

  const [roomsRaw, occupied, settings] = await Promise.all([
    listAllRoomsForPublic(),
    listOccupiedRoomRanges(undefined, {
      forPublicCalendar: true,
      rangeStart: checkIn,
      rangeEnd: checkOut,
    }),
    getPensionSettings().catch(() => null),
  ]);

  const checkInTime =
    settings?.default_check_in_time ?? DEFAULT_CHECK_IN_TIME;
  const checkOutTime =
    settings?.default_check_out_time ?? DEFAULT_CHECK_OUT_TIME;

  const rooms = roomsRaw
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      building_name: r.building_name,
      has_ac: r.has_ac,
      capacity_max:
        r.capacity_base +
        (r.allows_extra_beds ? r.max_extra_beds_per_room : 0),
      price_per_night: Number(r.price_per_night),
    }));

  return computeGuestStayOptions(
    rooms,
    occupied,
    checkIn,
    checkOut,
    guestCount,
    { checkIn: checkInTime, checkOut: checkOutTime }
  );
});

import { cache } from "react";
import { computeGuestStayOptions } from "@/domain/availability/guest-stay-options";
import type { GuestStayPreview } from "@/domain/availability/guest-stay-options";
import type { Party } from "@/domain/availability/party";
import { listOccupiedRoomRanges } from "@/services/bookings";
import { listAllRoomsForPublic } from "@/services/rooms-admin";
import { getPensionSettings } from "@/services/pension-settings";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import { getFreeStockForStay } from "@/services/stay-inventory";
import { DEFAULT_BOOKING_RULES, toStayPricingRules } from "@/domain/settings/booking-rules";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
} from "@/lib/constants";

const loadGuestStayPreviewCached = cache(async (
  checkIn: string,
  checkOut: string,
  partyKey: string,
): Promise<GuestStayPreview> => {
  const party = JSON.parse(partyKey) as Party;

  const [roomsRaw, occupied, settings, rules] = await Promise.all([
    listAllRoomsForPublic(),
    listOccupiedRoomRanges(undefined, {
      forPublicCalendar: true,
      rangeStart: checkIn,
      rangeEnd: checkOut,
    }),
    getPensionSettings().catch(() => null),
    getBookingRulesSettings().catch(() => DEFAULT_BOOKING_RULES),
  ]);

  const inventory = await getFreeStockForStay({
    checkIn,
    checkOut,
    policy: rules.childPolicy,
  });

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
      capacity_base: r.capacity_base,
      allows_extra_beds: r.allows_extra_beds,
      max_extra_beds_per_room: r.max_extra_beds_per_room,
      max_cots: r.max_cots,
      max_occupancy: r.max_occupancy,
      price_per_night: Number(r.price_per_night),
    }));

  return computeGuestStayOptions({
    rooms,
    occupied,
    checkIn,
    checkOut,
    party,
    policy: rules.childPolicy,
    inventory,
    times: { checkIn: checkInTime, checkOut: checkOutTime },
    pricingRules: toStayPricingRules(rules),
  });
});

export async function loadGuestStayPreview(
  checkIn: string,
  checkOut: string,
  party: Party,
): Promise<GuestStayPreview> {
  return loadGuestStayPreviewCached(checkIn, checkOut, JSON.stringify(party));
}

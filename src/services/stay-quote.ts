import type { Party } from "@/domain/availability/party";
import { quoteStay, type StayQuote } from "@/domain/availability/stay-quote";
import { toStayPricingRules } from "@/domain/settings/booking-rules";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import { getRoomsByIds } from "@/services/rooms-admin";
import { getFreeStockForStay } from "@/services/stay-inventory";

/**
 * Server check and price for a family in given rooms: child rules, the
 * rooms' cots and people limits, the property's free extra beds and cots,
 * and the optional fees. Throws when the rooms cannot host the party.
 */
export async function quoteStayForRooms(input: {
  party: Party;
  roomIds: string[];
  checkIn: string;
  checkOut: string;
  /** The booking being confirmed or edited: its own beds do not count as taken. */
  excludeBookingId?: string;
}): Promise<StayQuote> {
  const roomIds = [...new Set(input.roomIds.filter(Boolean))];
  const [rooms, rules] = await Promise.all([
    getRoomsByIds(roomIds),
    getBookingRulesSettings(),
  ]);
  if (roomIds.length === 0 || rooms.length !== roomIds.length) {
    throw new Error("booking.one_or_more_rooms_unavailable_reload");
  }
  const inventory = await getFreeStockForStay({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    policy: rules.childPolicy,
    excludeBookingId: input.excludeBookingId,
  });
  const quote = quoteStay({
    rooms,
    party: input.party,
    policy: rules.childPolicy,
    inventory,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    pricingRules: toStayPricingRules(rules),
  });
  if (!quote) throw new Error("booking.selected_rooms_cannot_host_all_guests");
  return quote;
}

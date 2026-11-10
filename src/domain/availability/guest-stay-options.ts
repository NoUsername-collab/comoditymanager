import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { isRoomFreeForStay } from "@/domain/availability/rooms-free";
import {
  rankRoomSetsForParty,
  roomMaxCapacity,
  UNLIMITED_INVENTORY,
  type InventoryUsage,
  type RoomCapacity,
  type RoomPlacement,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";
import { quoteStay } from "@/domain/availability/stay-quote";
import {
  partyHeadcount,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import { stayNightCount } from "@/lib/stay-dates";

export type GuestOptionRoom = RoomCapacity & {
  id: string;
  /** The room's type (room settings), when it has one. */
  room_type_id: string | null;
  /** The cover photo of the room's type, from the photo library. */
  photo?: { url: string; focus: string } | null;
  name: string;
  building_name: string;
  has_ac: boolean;
  price_per_night: number;
};

export type GuestStayOption = {
  option_id: string;
  rooms: (GuestOptionRoom & { capacity_max: number })[];
  /** Who sleeps where, one entry per room in `rooms` order. */
  placement: RoomPlacement[];
  /** Extra beds and cots this option sets up. */
  usage: InventoryUsage;
  nights: number;
  price_per_night: number;
  /** Extra beds and cots, when the property charges for them. */
  extras_total_ron: number;
  total_estimate_ron: number;
};

export type GuestStayUnavailableReason = "invalid" | "no_free_rooms" | "no_fit";

export type GuestStayPreview = {
  check_in: string;
  check_out: string;
  party: Party;
  guest_count: number;
  nights: number;
  free_room_count: number;
  can_host: boolean;
  options: GuestStayOption[];
  reason: GuestStayUnavailableReason | null;
};

const MAX_OPTIONS = 4;

export function guestStayOptionId(roomIds: string[]): string {
  return [...roomIds].sort().join(",");
}

export function computeGuestStayOptions(args: {
  rooms: GuestOptionRoom[];
  occupied: { room_id: string; check_in: string; check_out: string }[];
  checkIn: string;
  checkOut: string;
  party: Party;
  policy: ChildPolicy;
  /** Extra beds and cots the property still has free on these dates. */
  inventory?: SharedInventory;
  times: { checkIn: string; checkOut: string };
  pricingRules?: StayPricingRules | null;
  /**
   * The room type the visitor came for (a room card's link): variants with a
   * room of that type come first, so they make the short list, then the rest.
   */
  preferRoomTypeId?: string | null;
}): GuestStayPreview {
  const { checkIn, checkOut, party } = args;
  const base = {
    check_in: checkIn,
    check_out: checkOut,
    party,
    guest_count: partyHeadcount(party),
  };

  if (!isAtLeastOneNight(checkIn, checkOut) || party.adults < 1) {
    return {
      ...base,
      nights: 0,
      free_room_count: 0,
      can_host: false,
      options: [],
      reason: "invalid",
    };
  }

  const nights = stayNightCount(checkIn, checkOut);
  const freeRooms = args.rooms.filter((r) =>
    isRoomFreeForStay(
      r.id,
      checkIn,
      checkOut,
      args.occupied,
      args.times.checkIn,
      args.times.checkOut,
    ),
  );

  const inventory = args.inventory ?? UNLIMITED_INVENTORY;
  const options: GuestStayOption[] = [];
  const ranked = rankRoomSetsForParty(party, freeRooms, args.policy, inventory);
  const prefer = args.preferRoomTypeId;
  const hasPreferred = (set: GuestOptionRoom[]) => set.some((room) => room.room_type_id === prefer);
  const ordered = prefer
    ? [...ranked.filter(hasPreferred), ...ranked.filter((set) => !hasPreferred(set))]
    : ranked;
  for (const set of ordered) {
    if (options.length >= MAX_OPTIONS) break;
    const quote = quoteStay({
      rooms: set,
      party,
      policy: args.policy,
      inventory,
      checkIn,
      checkOut,
      pricingRules: args.pricingRules,
    });
    if (!quote) continue;
    options.push({
      option_id: guestStayOptionId(set.map((room) => room.id)),
      rooms: set.map((room) => ({ ...room, capacity_max: roomMaxCapacity(room) })),
      placement: quote.placement,
      usage: quote.usage,
      nights,
      price_per_night: set.reduce((sum, room) => sum + room.price_per_night, 0),
      extras_total_ron: quote.extrasTotal,
      total_estimate_ron: quote.total,
    });
  }

  return {
    ...base,
    nights,
    free_room_count: freeRooms.length,
    can_host: options.length > 0,
    options,
    reason:
      options.length > 0 ? null : freeRooms.length === 0 ? "no_free_rooms" : "no_fit",
  };
}

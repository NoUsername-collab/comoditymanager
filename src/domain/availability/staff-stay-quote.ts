import {
  canRoomsHostGuests,
  minRoomsToHostGuests,
  totalCapacityOfRooms,
  type RoomCapacity,
} from "@/domain/availability/stay-capacity";
import {
  computeRoomStayPricing,
  computeStandardStayTotal,
} from "@/domain/pricing/nightly-rates";
import type { StayPricingRules } from "@/domain/settings/booking-rules";

export type StaffStayQuoteRoom = RoomCapacity & {
  id: string;
  name: string;
  price_per_night: number;
};

export type StaffStayQuoteLine = {
  roomId: string;
  roomName: string;
  lineTotal: number;
};

export type StaffStayQuote = {
  guestCount: number;
  selected: StaffStayQuoteRoom[];
  selectedCapacity: number;
  hostsGuests: boolean;
  minRoomsNeeded: number;
  canFulfill: boolean;
  estimateRon: number;
  lines: StaffStayQuoteLine[];
};

export function mergeStayRoomSelection(
  previousIds: string[],
  availableIds: string[],
  preferredIds: string[],
): string[] {
  const available = new Set(availableIds);
  const kept = previousIds.filter((id) => available.has(id));
  if (kept.length > 0) return kept;
  return preferredIds.filter((id) => available.has(id));
}

export function partyGuestCount(numAdults: number, numChildren: number): number {
  const adults = Number.isFinite(numAdults) ? Math.max(1, Math.floor(numAdults)) : 1;
  const children = Number.isFinite(numChildren)
    ? Math.max(0, Math.floor(numChildren))
    : 0;
  return adults + children;
}

export function quoteStaffStaySelection(args: {
  availableRooms: StaffStayQuoteRoom[];
  selectedIds: string[];
  guestCount: number;
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): StaffStayQuote {
  const guestCount = Math.max(1, args.guestCount);
  const idSet = new Set(args.selectedIds);
  const selected = args.availableRooms.filter((room) => idSet.has(room.id));
  const { possible, minRooms } = minRoomsToHostGuests(guestCount, args.availableRooms);

  return {
    guestCount,
    selected,
    selectedCapacity: totalCapacityOfRooms(selected),
    hostsGuests: selected.length > 0 && canRoomsHostGuests(guestCount, selected),
    minRoomsNeeded: minRooms,
    canFulfill: possible,
    estimateRon:
      selected.length > 0
        ? computeStandardStayTotal(
            selected,
            args.checkIn,
            args.checkOut,
            args.pricingRules,
          )
        : 0,
    lines: selected.map((room) => {
      const pricing = computeRoomStayPricing(
        room,
        args.checkIn,
        args.checkOut,
        args.pricingRules,
      );
      return {
        roomId: room.id,
        roomName: room.name,
        lineTotal: pricing.line_total,
      };
    }),
  };
}

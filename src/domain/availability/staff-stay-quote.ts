import {
  canRoomsHostGuests,
  minRoomsToHostGuests,
  roomMaxCapacity,
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
  building_name?: string;
};

export type StaffStaySuggestionKind = "preferred" | "cheapest_single" | "combo";

export type StaffStaySuggestion = {
  id: string;
  kind: StaffStaySuggestionKind;
  roomIds: string[];
  rooms: StaffStayQuoteRoom[];
  estimateRon: number;
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

export function staffStaySelectionKey(roomIds: string[]): string {
  return [...roomIds].sort().join(",");
}

function compareRoomsByPriceThenName(a: StaffStayQuoteRoom, b: StaffStayQuoteRoom): number {
  if (a.price_per_night !== b.price_per_night) {
    return a.price_per_night - b.price_per_night;
  }
  return a.name.localeCompare(b.name);
}

function roomsByIds(
  availableRooms: StaffStayQuoteRoom[],
  ids: string[],
): StaffStayQuoteRoom[] {
  const byId = new Map(availableRooms.map((room) => [room.id, room]));
  return ids
    .map((id) => byId.get(id))
    .filter((room): room is StaffStayQuoteRoom => Boolean(room));
}

function cheapestSingleThatFits(
  rooms: StaffStayQuoteRoom[],
  guestCount: number,
): StaffStayQuoteRoom | null {
  const fits = rooms.filter((room) => roomMaxCapacity(room) >= guestCount);
  if (fits.length === 0) return null;
  return [...fits].sort(compareRoomsByPriceThenName)[0] ?? null;
}

/** Cheapest rooms first until capacity covers the party. */
function greedyCoverByPrice(
  rooms: StaffStayQuoteRoom[],
  guestCount: number,
): StaffStayQuoteRoom[] | null {
  const picked: StaffStayQuoteRoom[] = [];
  let capacity = 0;
  for (const room of [...rooms].sort(compareRoomsByPriceThenName)) {
    if (capacity >= guestCount) break;
    picked.push(room);
    capacity += roomMaxCapacity(room);
  }
  return capacity >= guestCount ? picked : null;
}

export function buildStaffStaySuggestions(args: {
  availableRooms: StaffStayQuoteRoom[];
  guestCount: number;
  preferredIds: string[];
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): StaffStaySuggestion[] {
  const guestCount = Math.max(1, args.guestCount);
  const seen = new Set<string>();
  const out: StaffStaySuggestion[] = [];

  function push(kind: StaffStaySuggestionKind, rooms: StaffStayQuoteRoom[]) {
    if (rooms.length === 0 || !canRoomsHostGuests(guestCount, rooms)) return;
    const id = staffStaySelectionKey(rooms.map((room) => room.id));
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      kind,
      roomIds: rooms.map((room) => room.id),
      rooms,
      estimateRon: computeStandardStayTotal(
        rooms,
        args.checkIn,
        args.checkOut,
        args.pricingRules,
      ),
    });
  }

  push("preferred", roomsByIds(args.availableRooms, args.preferredIds));

  const cheapestSingle = cheapestSingleThatFits(args.availableRooms, guestCount);
  if (cheapestSingle) push("cheapest_single", [cheapestSingle]);

  const combo = greedyCoverByPrice(args.availableRooms, guestCount);
  if (combo && combo.length > 1) push("combo", combo);

  return out.slice(0, 3);
}

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

/** Keep a hosting selection; otherwise Gantt rooms if they host; otherwise first suggestion. */
export function resolveStaffStaySelection(args: {
  previousIds: string[];
  availableRooms: StaffStayQuoteRoom[];
  preferredIds: string[];
  guestCount: number;
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): string[] {
  const guestCount = Math.max(1, args.guestCount);
  const previous = roomsByIds(args.availableRooms, args.previousIds);
  if (previous.length > 0 && canRoomsHostGuests(guestCount, previous)) {
    return previous.map((room) => room.id);
  }

  const preferred = roomsByIds(args.availableRooms, args.preferredIds);
  if (preferred.length > 0 && canRoomsHostGuests(guestCount, preferred)) {
    return preferred.map((room) => room.id);
  }

  return (
    buildStaffStaySuggestions({
      availableRooms: args.availableRooms,
      guestCount,
      preferredIds: args.preferredIds,
      checkIn: args.checkIn,
      checkOut: args.checkOut,
      pricingRules: args.pricingRules,
    })[0]?.roomIds ?? preferred.map((room) => room.id)
  );
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

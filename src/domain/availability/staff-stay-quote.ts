import {
  canRoomsHostParty,
  minRoomsToHostParty,
  rankRoomSetsForParty,
  totalCapacityOfRooms,
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

type StaffStaySuggestionKind = "preferred" | "cheapest_single" | "combo";

export type StaffStaySuggestion = {
  id: string;
  kind: StaffStaySuggestionKind;
  roomIds: string[];
  rooms: StaffStayQuoteRoom[];
  estimateRon: number;
};

type StaffStayQuoteLine = {
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
  /** Extra beds and cots of the selection, priced when the property charges for them. */
  usage: InventoryUsage;
  extrasTotal: number;
  /** Who sleeps where in the selected rooms; empty when they cannot host the party. */
  placement: RoomPlacement[];
};

export function staffStaySelectionKey(roomIds: string[]): string {
  return [...roomIds].sort().join(",");
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

export function buildStaffStaySuggestions(args: {
  availableRooms: StaffStayQuoteRoom[];
  party: Party;
  policy: ChildPolicy;
  inventory?: SharedInventory;
  preferredIds: string[];
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): StaffStaySuggestion[] {
  const inventory = args.inventory ?? UNLIMITED_INVENTORY;
  const seen = new Set<string>();
  const out: StaffStaySuggestion[] = [];

  function push(kind: StaffStaySuggestionKind, rooms: StaffStayQuoteRoom[]) {
    const id = staffStaySelectionKey(rooms.map((room) => room.id));
    if (rooms.length === 0 || seen.has(id)) return;
    const quote = quoteStay({ ...args, rooms, inventory });
    if (!quote) return;
    seen.add(id);
    out.push({
      id,
      kind,
      roomIds: rooms.map((room) => room.id),
      rooms,
      estimateRon: quote.total,
    });
  }

  push("preferred", roomsByIds(args.availableRooms, args.preferredIds));

  const ranked = rankRoomSetsForParty(args.party, args.availableRooms, args.policy, inventory);
  const single = ranked.find((set) => set.length === 1);
  if (single) push("cheapest_single", single);
  const combo = ranked.find((set) => set.length > 1);
  if (combo) push("combo", combo);

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
  party: Party;
  policy: ChildPolicy;
  inventory?: SharedInventory;
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): string[] {
  const inventory = args.inventory ?? UNLIMITED_INVENTORY;
  const previous = roomsByIds(args.availableRooms, args.previousIds);
  if (previous.length > 0 && canRoomsHostParty(args.party, previous, args.policy, inventory)) {
    return previous.map((room) => room.id);
  }

  const preferred = roomsByIds(args.availableRooms, args.preferredIds);
  if (preferred.length > 0 && canRoomsHostParty(args.party, preferred, args.policy, inventory)) {
    return preferred.map((room) => room.id);
  }

  return (
    buildStaffStaySuggestions(args)[0]?.roomIds ?? preferred.map((room) => room.id)
  );
}

export function quoteStaffStaySelection(args: {
  availableRooms: StaffStayQuoteRoom[];
  selectedIds: string[];
  party: Party;
  policy: ChildPolicy;
  inventory?: SharedInventory;
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): StaffStayQuote {
  const inventory = args.inventory ?? UNLIMITED_INVENTORY;
  const idSet = new Set(args.selectedIds);
  const selected = args.availableRooms.filter((room) => idSet.has(room.id));
  const { possible, minRooms } = minRoomsToHostParty(
    args.party,
    args.availableRooms,
    args.policy,
    inventory,
  );
  const quote = quoteStay({ ...args, rooms: selected, inventory });

  return {
    guestCount: partyHeadcount(args.party),
    selected,
    selectedCapacity: totalCapacityOfRooms(selected),
    hostsGuests: quote != null,
    minRoomsNeeded: minRooms,
    canFulfill: possible,
    // Rooms that cannot host the party still show what they cost, to help pick more.
    estimateRon:
      quote?.total ??
      (selected.length > 0
        ? computeStandardStayTotal(selected, args.checkIn, args.checkOut, args.pricingRules)
        : 0),
    usage: quote?.usage ?? { extraBeds: 0, cots: 0 },
    extrasTotal: quote?.extrasTotal ?? 0,
    placement: quote?.placement ?? [],
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

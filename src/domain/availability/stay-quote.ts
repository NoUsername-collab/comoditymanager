import type { ChildPolicy, Party } from "@/domain/availability/party";
import {
  placeParty,
  placementUsage,
  UNLIMITED_INVENTORY,
  type InventoryUsage,
  type RoomCapacity,
  type RoomPlacement,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";
import {
  computeStandardStayTotal,
  computeStayExtrasTotal,
  type RoomNightPrice,
} from "@/domain/pricing/nightly-rates";
import type { StayPricingRules } from "@/domain/settings/booking-rules";

export type StayQuote = {
  /** Who sleeps where, one entry per room (same order as the rooms). */
  placement: RoomPlacement[];
  usage: InventoryUsage;
  roomsTotal: number;
  /** Extra beds and cots, when the property charges for them. */
  extrasTotal: number;
  total: number;
};

/**
 * The single answer to "can these rooms host this family, how, and for how
 * much". Every screen, every server check and the invoice go through it, so
 * they can never disagree. Null when the rooms cannot host the party.
 */
export function quoteStay(args: {
  rooms: (RoomCapacity & RoomNightPrice)[];
  party: Party;
  policy: ChildPolicy;
  inventory?: SharedInventory;
  checkIn: string;
  checkOut: string;
  pricingRules?: StayPricingRules | null;
}): StayQuote | null {
  if (args.rooms.length === 0) return null;
  const placement = placeParty(
    args.party,
    args.rooms,
    args.policy,
    args.inventory ?? UNLIMITED_INVENTORY,
  );
  if (!placement) return null;
  const usage = placementUsage(placement);
  const roomsTotal = computeStandardStayTotal(
    args.rooms,
    args.checkIn,
    args.checkOut,
    args.pricingRules,
  );
  const extrasTotal = computeStayExtrasTotal(
    usage,
    args.checkIn,
    args.checkOut,
    args.pricingRules,
  );
  return {
    placement,
    usage,
    roomsTotal,
    extrasTotal,
    total: Math.round((roomsTotal + extrasTotal) * 100) / 100,
  };
}

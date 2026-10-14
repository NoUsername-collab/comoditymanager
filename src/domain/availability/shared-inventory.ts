import { stayNightDates } from "@/lib/stay-dates";
import type { ChildPolicy, Party } from "@/domain/availability/party";
import {
  placeParty,
  placementUsage,
  type InventoryUsage,
  type RoomCapacity,
  type SharedInventory,
} from "@/domain/availability/stay-capacity";

/** Another stay that overlaps the dates: its party and which room it holds when. */
export type OverlappingStay = {
  bookingId: string;
  party: Party;
  segments: { roomId: string; checkIn: string; checkOut: string }[];
};

/** What the property owns in total. */
export type InventoryStock = { extraBeds: number; cots: number };

/**
 * Extra beds and cots taken on the busiest night of [checkIn, checkOut).
 * Each stay is placed with the same rules as a new booking, so what it takes
 * always matches its party and rooms — nothing is stored that could drift.
 * A stay that no longer fits the rules is counted with every extra bed and
 * cot its rooms have, so the stock is never over-promised.
 */
export function inventoryInUse(args: {
  checkIn: string;
  checkOut: string;
  stays: OverlappingStay[];
  rooms: Map<string, RoomCapacity>;
  policy: ChildPolicy;
}): InventoryUsage {
  const cache = new Map<string, InventoryUsage>();

  function usageFor(stay: OverlappingStay, roomIds: string[]): InventoryUsage {
    const key = `${stay.bookingId}|${[...roomIds].sort().join(",")}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const rooms = roomIds
      .map((id) => args.rooms.get(id))
      .filter((room): room is RoomCapacity => Boolean(room));
    const placed = placeParty(stay.party, rooms, args.policy);
    const usage = placed
      ? placementUsage(placed)
      : rooms.reduce(
          (sum, room) => ({
            extraBeds:
              sum.extraBeds + (room.allows_extra_beds ? room.max_extra_beds_per_room : 0),
            cots: sum.cots + Math.max(0, room.max_cots ?? 0),
          }),
          { extraBeds: 0, cots: 0 },
        );
    cache.set(key, usage);
    return usage;
  }

  let busiest: InventoryUsage = { extraBeds: 0, cots: 0 };
  for (const night of stayNightDates(args.checkIn, args.checkOut)) {
    const tonight: InventoryUsage = { extraBeds: 0, cots: 0 };
    for (const stay of args.stays) {
      const roomIds = [
        ...new Set(
          stay.segments
            .filter((segment) => segment.checkIn <= night && night < segment.checkOut)
            .map((segment) => segment.roomId),
        ),
      ];
      if (roomIds.length === 0) continue;
      const usage = usageFor(stay, roomIds);
      tonight.extraBeds += usage.extraBeds;
      tonight.cots += usage.cots;
    }
    busiest = {
      extraBeds: Math.max(busiest.extraBeds, tonight.extraBeds),
      cots: Math.max(busiest.cots, tonight.cots),
    };
  }
  return busiest;
}

/** What is still free for a new stay. */
export function remainingInventory(
  stock: InventoryStock,
  used: InventoryUsage,
): SharedInventory {
  return {
    extraBeds: Math.max(0, stock.extraBeds - used.extraBeds),
    cots: Math.max(0, stock.cots - used.cots),
  };
}

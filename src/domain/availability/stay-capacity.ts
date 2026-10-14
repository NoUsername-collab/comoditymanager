import {
  minorCount,
  partyGroup,
  type ChildPolicy,
  type Party,
  type PartyGroup,
} from "@/domain/availability/party";

export type RoomCapacity = {
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  /** Baby cots that fit in the room. Cots are not extra beds. */
  max_cots?: number;
  /** Most people allowed in the room, babies included. Empty = only the beds limit. */
  max_occupancy?: number | null;
};

/**
 * Extra beds and cots the property still has free for the stay (it owns a
 * fixed number and other stays may be using some). `null` = not limited.
 */
export type SharedInventory = {
  extraBeds: number | null;
  cots: number | null;
};

export const UNLIMITED_INVENTORY: SharedInventory = { extraBeds: null, cots: null };

/** Extra beds and cots a stay takes from the property's stock. */
export type InventoryUsage = { extraBeds: number; cots: number };

/** Who sleeps in one room and what it takes. */
export type RoomPlacement = PartyGroup & {
  /** Babies in the parents' bed. */
  infantsWithParents: number;
  /** Babies in a cot (equals the cots used). */
  cots: number;
  /** Babies on a bed place because no cot or parents' bed was available. */
  infantsInBeds: number;
  /** Extra beds set up in the room. */
  extraBeds: number;
};

/** Bed places: the room's beds plus the extra beds it can take. */
export function roomMaxCapacity(room: RoomCapacity): number {
  return (
    room.capacity_base +
    (room.allows_extra_beds ? room.max_extra_beds_per_room : 0)
  );
}

function roomExtraBeds(room: RoomCapacity): number {
  return room.allows_extra_beds ? room.max_extra_beds_per_room : 0;
}

function roomCots(room: RoomCapacity): number {
  return Math.max(0, room.max_cots ?? 0);
}

/** Most people the room may hold, babies included. */
export function roomPeopleLimit(room: RoomCapacity): number {
  const physical = roomMaxCapacity(room) * 2 + 1 + roomCots(room);
  return room.max_occupancy != null && room.max_occupancy > 0
    ? Math.min(room.max_occupancy, physical)
    : physical;
}

export function totalCapacityOfRooms(rooms: RoomCapacity[]): number {
  return rooms.reduce((sum, r) => sum + roomMaxCapacity(r), 0);
}

export function placementUsage(placements: RoomPlacement[]): InventoryUsage {
  return placements.reduce(
    (sum, p) => ({ extraBeds: sum.extraBeds + p.extraBeds, cots: sum.cots + p.cots }),
    { extraBeds: 0, cots: 0 },
  );
}

const EMPTY_GROUP: PartyGroup = {
  adults: 0,
  infants: 0,
  children: 0,
  teens: 0,
  unknown: 0,
};

const EMPTY_PLACEMENT: RoomPlacement = {
  ...EMPTY_GROUP,
  infantsWithParents: 0,
  cots: 0,
  infantsInBeds: 0,
  extraBeds: 0,
};

/**
 * What an arrangement costs: extra beds and cots come from a shared stock,
 * and a baby on a bed place is the last resort (a cot is set up first).
 */
function placementWeight(p: RoomPlacement): number {
  return p.extraBeds + p.cots + p.infantsInBeds * 2;
}

type FitOptions = { minorsWithoutAdult?: boolean };

/**
 * Ways a group can sleep in one room, cheapest first (fewest extra beds and
 * cots). Rules:
 * - adults, teens and minors of unknown age take a bed place each;
 * - a baby sleeps with the parents (one per adult, if allowed), in a cot, or
 *   else on a bed place shared like a child's;
 * - one child may sleep with the parents (or a teen, when the only minor);
 *   a baby takes that place only when babies may sleep with the parents;
 * - the other children share a place two by two;
 * - the room's people limit counts everyone, babies included.
 * Empty when the group may not stay in this room.
 */
export function roomPlacementOptions(
  group: PartyGroup,
  room: RoomCapacity,
  policy: ChildPolicy,
  options: FitOptions = {},
): RoomPlacement[] {
  const minors = minorCount(group);
  const people = group.adults + minors;
  if (people === 0) return [EMPTY_PLACEMENT];
  if (group.adults === 0) {
    // Only on the parents' request, and only with a teen looking after the room.
    if (!options.minorsWithoutAdult || group.teens === 0 || group.infants > 0) {
      return [];
    }
  }
  if (people > roomPeopleLimit(room)) return [];

  const out: RoomPlacement[] = [];
  const maxCots = Math.min(group.infants, roomCots(room));
  for (let cots = 0; cots <= maxCots; cots += 1) {
    const babiesLeft = group.infants - cots;
    const infantsWithParents = policy.infantsWithParents
      ? Math.min(babiesLeft, group.adults)
      : 0;
    let infantsInBeds = babiesLeft - infantsWithParents;
    let children = group.children;
    let teens = group.teens;
    if (policy.childWithParents && group.adults > 0) {
      if (children > 0) {
        children -= 1;
      } else if (policy.infantsWithParents && infantsInBeds > 0) {
        infantsInBeds -= 1;
      } else if (
        policy.loneTeenWithParents &&
        teens === 1 &&
        group.infants === 0 &&
        group.unknown === 0
      ) {
        teens = 0;
      }
    }
    const sharing = children + infantsInBeds;
    const childPlaces = policy.childrenShareBed ? Math.ceil(sharing / 2) : sharing;
    const places = group.adults + teens + group.unknown + childPlaces;
    const extraBeds = Math.max(0, places - room.capacity_base);
    if (extraBeds > roomExtraBeds(room)) continue;
    out.push({ ...group, infantsWithParents, cots, infantsInBeds, extraBeds });
  }
  // Keep only arrangements not beaten on every count by another one.
  return out
    .filter(
      (option, i) =>
        !out.some(
          (other, j) =>
            j !== i &&
            other.cots <= option.cots &&
            other.extraBeds <= option.extraBeds &&
            other.infantsInBeds <= option.infantsInBeds &&
            placementWeight(other) < placementWeight(option),
        ),
    )
    .sort((a, b) => placementWeight(a) - placementWeight(b));
}

export function groupFitsRoom(
  group: PartyGroup,
  room: RoomCapacity,
  policy: ChildPolicy,
  options: FitOptions = {},
): boolean {
  return roomPlacementOptions(group, room, policy, options).length > 0;
}

function subtract(a: PartyGroup, b: PartyGroup): PartyGroup {
  return {
    adults: a.adults - b.adults,
    infants: a.infants - b.infants,
    children: a.children - b.children,
    teens: a.teens - b.teens,
    unknown: a.unknown - b.unknown,
  };
}

function isEmpty(g: PartyGroup): boolean {
  return g.adults + minorCount(g) === 0;
}

function stockKey(n: number): string {
  return Number.isFinite(n) ? String(n) : "∞";
}

type Plan = { cost: number; rooms: RoomPlacement[] };

/**
 * Splits the party over the given rooms (one placement per room, same order)
 * using the fewest extra beds and cots, within the property's free stock.
 * Every room with children keeps an adult. Null when it cannot be done.
 */
export function placeParty(
  party: Party,
  rooms: RoomCapacity[],
  policy: ChildPolicy,
  inventory: SharedInventory = UNLIMITED_INVENTORY,
): RoomPlacement[] | null {
  return solvePlacement(party, rooms, policy, inventory, "cheapest")?.rooms ?? null;
}

export function canRoomsHostParty(
  party: Party,
  rooms: RoomCapacity[],
  policy: ChildPolicy,
  inventory: SharedInventory = UNLIMITED_INVENTORY,
): boolean {
  return solvePlacement(party, rooms, policy, inventory, "any") != null;
}

function solvePlacement(
  party: Party,
  rooms: RoomCapacity[],
  policy: ChildPolicy,
  inventory: SharedInventory,
  mode: "any" | "cheapest",
): Plan | null {
  const total = partyGroup(party, policy);
  const fit = { minorsWithoutAdult: party.childrenSeparateRoom };
  if (isEmpty(total)) return { cost: 0, rooms: rooms.map(() => EMPTY_PLACEMENT) };
  if (rooms.length === 0) return null;

  const memo = new Map<string, Plan | null>();

  function solve(
    index: number,
    left: PartyGroup,
    extraLeft: number,
    cotsLeft: number,
  ): Plan | null {
    if (isEmpty(left)) {
      return { cost: 0, rooms: rooms.slice(index).map(() => EMPTY_PLACEMENT) };
    }
    if (index >= rooms.length) return null;
    const key = `${index}|${left.adults}|${left.infants}|${left.children}|${left.teens}|${left.unknown}|${stockKey(extraLeft)}|${stockKey(cotsLeft)}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    const room = rooms[index];
    const places = roomMaxCapacity(room);
    const limit = roomPeopleLimit(room);
    let best: Plan | null = null;

    // Fill each room as much as possible first, so families stay in as few rooms as possible.
    search: for (let a = Math.min(left.adults, places); a >= 0; a -= 1) {
      for (let t = Math.min(left.teens, places + 1); t >= 0; t -= 1) {
        for (let u = Math.min(left.unknown, places); u >= 0; u -= 1) {
          if (a + t + u > places + 1) continue;
          for (let c = Math.min(left.children, places * 2 + 1); c >= 0; c -= 1) {
            for (let i = left.infants; i >= 0; i -= 1) {
              if (a + t + u + c + i > limit) continue;
              const here: PartyGroup = { adults: a, infants: i, children: c, teens: t, unknown: u };
              const choices = isEmpty(here)
                ? [EMPTY_PLACEMENT]
                : roomPlacementOptions(here, room, policy, fit);
              for (const choice of choices) {
                if (choice.extraBeds > extraLeft || choice.cots > cotsLeft) continue;
                const rest = solve(
                  index + 1,
                  subtract(left, here),
                  extraLeft - choice.extraBeds,
                  cotsLeft - choice.cots,
                );
                if (!rest) continue;
                const cost = placementWeight(choice) + rest.cost;
                if (!best || cost < best.cost) {
                  best = { cost, rooms: [choice, ...rest.rooms] };
                }
                if (mode === "any" || best.cost === 0) break search;
              }
            }
          }
        }
      }
    }

    memo.set(key, best);
    return best;
  }

  return solve(
    0,
    total,
    inventory.extraBeds ?? Number.POSITIVE_INFINITY,
    inventory.cots ?? Number.POSITIVE_INFINITY,
  );
}

/**
 * Fewest rooms from the list that host the party, trying the biggest rooms
 * first (bed places, then cots, then people limit). `possible` is exact: the
 * last try uses every room.
 */
export function minRoomsToHostParty(
  party: Party,
  rooms: RoomCapacity[],
  policy: ChildPolicy,
  inventory: SharedInventory = UNLIMITED_INVENTORY,
): { possible: boolean; minRooms: number } {
  const sorted = [...rooms].sort(
    (a, b) =>
      roomMaxCapacity(b) - roomMaxCapacity(a) ||
      roomCots(b) - roomCots(a) ||
      roomPeopleLimit(b) - roomPeopleLimit(a),
  );
  for (let k = 1; k <= sorted.length; k += 1) {
    if (canRoomsHostParty(party, sorted.slice(0, k), policy, inventory)) {
      return { possible: true, minRooms: k };
    }
  }
  return { possible: false, minRooms: sorted.length };
}

export type RankableRoom = RoomCapacity & {
  id: string;
  name: string;
  price_per_night: number;
  building_name?: string | null;
};

function byPriceThenName(a: RankableRoom, b: RankableRoom): number {
  if (a.price_per_night !== b.price_per_night) {
    return a.price_per_night - b.price_per_night;
  }
  return a.name.localeCompare(b.name);
}

function setPrice(rooms: RankableRoom[]): number {
  return rooms.reduce((sum, room) => sum + room.price_per_night, 0);
}

function sameBuilding(rooms: RankableRoom[]): boolean {
  const first = rooms[0]?.building_name ?? null;
  return first != null && rooms.every((room) => room.building_name === first);
}

/** Exhaustive pair search stays cheap up to this many free rooms. */
const PAIR_SEARCH_LIMIT = 40;

/**
 * Room sets that host the party, best first:
 * 1. one room for the whole family (cheapest first);
 * 2. two rooms in the same building, then any two rooms (cheapest first);
 *    a family that fits in one room never gets this split;
 * 3. larger groups: fewest big rooms, then the cheapest cover.
 * When the parents asked for a separate children's room, pairs come first.
 */
export function rankRoomSetsForParty<R extends RankableRoom>(
  party: Party,
  rooms: R[],
  policy: ChildPolicy,
  inventory: SharedInventory = UNLIMITED_INVENTORY,
): R[][] {
  const hosts = (set: R[]) => canRoomsHostParty(party, set, policy, inventory);
  const out: R[][] = [];
  const seen = new Set<string>();
  const push = (set: R[]) => {
    const key = set.map((room) => room.id).sort().join(",");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(set);
  };

  const singles = rooms.filter((room) => hosts([room])).sort(byPriceThenName);
  const singleIds = new Set(singles.map((room) => room.id));

  // A family that fits in one room is never offered a split; adults alone may take two cheaper rooms.
  const pairs: R[][] = [];
  const offerPairs =
    singles.length === 0 ||
    party.childrenSeparateRoom ||
    party.childAges.length === 0;
  if (rooms.length <= PAIR_SEARCH_LIMIT && offerPairs) {
    for (let i = 0; i < rooms.length; i += 1) {
      for (let j = i + 1; j < rooms.length; j += 1) {
        const pair = [rooms[i], rooms[j]].sort(byPriceThenName);
        // A pair holding a room that already fits everyone only adds cost.
        if (!party.childrenSeparateRoom && pair.some((room) => singleIds.has(room.id))) {
          continue;
        }
        if (hosts(pair)) pairs.push(pair);
      }
    }
    pairs.sort((a, b) => {
      const building = Number(sameBuilding(b)) - Number(sameBuilding(a));
      if (building !== 0) return building;
      return setPrice(a) - setPrice(b);
    });
  }

  if (party.childrenSeparateRoom) pairs.forEach(push);
  singles.forEach((room) => push([room]));
  if (!party.childrenSeparateRoom) pairs.forEach(push);

  if (out.length === 0) {
    const { possible, minRooms } = minRoomsToHostParty(party, rooms, policy, inventory);
    if (possible) {
      const biggest = [...rooms]
        .sort((a, b) => roomMaxCapacity(b) - roomMaxCapacity(a) || byPriceThenName(a, b))
        .slice(0, minRooms);
      if (hosts(biggest)) push(biggest.sort(byPriceThenName));

      const cheapest: R[] = [];
      for (const room of [...rooms].sort(byPriceThenName)) {
        cheapest.push(room);
        if (hosts(cheapest)) {
          push([...cheapest]);
          break;
        }
      }
    }
  }

  return out;
}

import { describe, it, expect } from "vitest";
import {
  canRoomsHostParty,
  minRoomsToHostParty,
  placeParty,
  rankRoomSetsForParty,
  roomMaxCapacity,
  totalCapacityOfRooms,
  type RankableRoom,
  type RoomCapacity,
} from "@/domain/availability/stay-capacity";
import {
  DEFAULT_CHILD_POLICY,
  type ChildPolicy,
  type Party,
} from "@/domain/availability/party";

function room(base: number, extras = 0): RoomCapacity {
  return {
    capacity_base: base,
    allows_extra_beds: extras > 0,
    max_extra_beds_per_room: extras,
  };
}

function party(adults: number, childAges: (number | null)[] = [], separate = false): Party {
  return { adults, childAges, childrenSeparateRoom: separate };
}

const P = DEFAULT_CHILD_POLICY;
const DOUBLE = room(2);
const DOUBLE_EXTRA = room(2, 1);
const TRIPLE = room(3);
const QUAD = room(4);

describe("roomMaxCapacity", () => {
  it("counts beds plus allowed extra beds", () => {
    expect(roomMaxCapacity(room(3))).toBe(3);
    expect(roomMaxCapacity(room(2, 3))).toBe(5);
    expect(
      roomMaxCapacity({ capacity_base: 3, allows_extra_beds: false, max_extra_beds_per_room: 2 }),
    ).toBe(3);
    expect(totalCapacityOfRooms([room(2, 1), room(3, 2)])).toBe(8);
  });
});

describe("one family, one room", () => {
  it("keeps parents and one child of any age under 14 in a double", () => {
    expect(canRoomsHostParty(party(2, [5]), [DOUBLE], P)).toBe(true);
    expect(canRoomsHostParty(party(2, [13]), [DOUBLE], P)).toBe(true);
  });

  it("lets a teen who is the only child stay with the parents", () => {
    expect(canRoomsHostParty(party(2, [16]), [DOUBLE], P)).toBe(true);
    expect(canRoomsHostParty(party(2, [17]), [DOUBLE], P)).toBe(true);
  });

  it("gives two teens a bed each", () => {
    expect(canRoomsHostParty(party(2, [15, 16]), [TRIPLE], P)).toBe(false);
    expect(canRoomsHostParty(party(2, [15, 16]), [QUAD], P)).toBe(true);
  });

  it("puts two children in one bed or on one extra bed", () => {
    expect(canRoomsHostParty(party(2, [5, 8]), [DOUBLE], P)).toBe(false);
    expect(canRoomsHostParty(party(2, [5, 8]), [DOUBLE_EXTRA], P)).toBe(true);
    expect(canRoomsHostParty(party(2, [5, 8]), [TRIPLE], P)).toBe(true);
    expect(canRoomsHostParty(party(2, [3, 6, 9]), [DOUBLE_EXTRA], P)).toBe(true);
  });

  it("does not count a baby as a bed", () => {
    expect(canRoomsHostParty(party(2, [1, 4]), [DOUBLE], P)).toBe(true);
    expect(canRoomsHostParty(party(1, [0]), [room(1)], P)).toBe(true);
  });

  it("lets each adult keep a baby in their bed", () => {
    expect(canRoomsHostParty(party(2, [0, 1]), [DOUBLE], P)).toBe(true);
    const [room] = placeParty(party(2, [0, 1]), [DOUBLE], P) ?? [];
    expect(room).toMatchObject({ infantsWithParents: 2, cots: 0, extraBeds: 0 });
  });

  it("counts minors of unknown age as needing their own bed", () => {
    expect(canRoomsHostParty(party(2, [null]), [DOUBLE], P)).toBe(false);
    expect(canRoomsHostParty(party(2, [null]), [TRIPLE], P)).toBe(true);
  });
});

describe("property rules", () => {
  const strict: ChildPolicy = {
    infantMaxAge: null,
    infantsWithParents: false,
    childMaxAge: 13,
    childrenShareBed: false,
    childWithParents: false,
    loneTeenWithParents: false,
  };

  it("counts every child as a bed when the property turns the rules off", () => {
    expect(canRoomsHostParty(party(2, [5]), [DOUBLE], strict)).toBe(false);
    expect(canRoomsHostParty(party(2, [1]), [DOUBLE], strict)).toBe(false);
    expect(canRoomsHostParty(party(2, [5, 8]), [QUAD], strict)).toBe(true);
    expect(canRoomsHostParty(party(2, [5, 8]), [TRIPLE], strict)).toBe(false);
  });

  it("moves the child age limit with the property", () => {
    const young: ChildPolicy = { ...P, childMaxAge: 9, loneTeenWithParents: false };
    expect(canRoomsHostParty(party(2, [9]), [DOUBLE], young)).toBe(true);
    expect(canRoomsHostParty(party(2, [10]), [DOUBLE], young)).toBe(false);
  });
});

describe("several rooms", () => {
  it("never leaves children in a room without an adult", () => {
    expect(placeParty(party(1, [15, 16]), [DOUBLE, DOUBLE], P)).toBeNull();
    expect(placeParty(party(1, [0]), [room(1), room(1)], P)).not.toBeNull();
  });

  it("splits a big family so each room has an adult", () => {
    const placed = placeParty(party(2, [8, 9, 10, 11]), [DOUBLE, DOUBLE], P);
    expect(placed).not.toBeNull();
    for (const group of placed ?? []) {
      expect(group.adults).toBeGreaterThan(0);
    }
  });

  it("gives teens their own room only when the parents ask for it", () => {
    expect(canRoomsHostParty(party(1, [15, 16], true), [DOUBLE, DOUBLE], P)).toBe(true);
    // A separate room still needs a teen in it: young children never stay alone.
    expect(canRoomsHostParty(party(1, [5, 6, 7, 8], true), [room(1), DOUBLE], P)).toBe(false);
  });

  it("finds the fewest rooms", () => {
    expect(minRoomsToHostParty(party(2, [5]), [DOUBLE, QUAD], P)).toEqual({
      possible: true,
      minRooms: 1,
    });
    expect(minRoomsToHostParty(party(5), [DOUBLE, TRIPLE, room(1)], P)).toEqual({
      possible: true,
      minRooms: 2,
    });
    expect(minRoomsToHostParty(party(8), [DOUBLE, DOUBLE], P)).toEqual({
      possible: false,
      minRooms: 2,
    });
  });
});

describe("rankRoomSetsForParty", () => {
  function r(
    id: string,
    capacity: RoomCapacity,
    price: number,
    building = "A",
  ): RankableRoom {
    return { id, name: id, price_per_night: price, building_name: building, ...capacity };
  }

  it("offers one room for the family before any split", () => {
    const rooms = [r("d", DOUBLE, 100), r("de", DOUBLE_EXTRA, 150), r("q", QUAD, 300)];
    const sets = rankRoomSetsForParty(party(2, [5, 8]), rooms, P);
    expect(sets.map((set) => set.map((x) => x.id))).toEqual([["de"], ["q"]]);
  });

  it("keeps a 2+1 family in a double instead of two rooms", () => {
    const rooms = [r("d1", DOUBLE, 100), r("d2", DOUBLE, 100)];
    const sets = rankRoomSetsForParty(party(2, [7]), rooms, P);
    expect(sets.map((set) => set.length)).toEqual([1, 1]);
  });

  it("prefers two rooms in the same building when the family needs two", () => {
    const rooms = [
      r("a1", DOUBLE, 120, "A"),
      r("b1", DOUBLE, 90, "B"),
      r("a2", DOUBLE, 120, "A"),
    ];
    const sets = rankRoomSetsForParty(party(4, [6, 9]), rooms, P);
    expect(sets[0]?.map((x) => x.id).sort()).toEqual(["a1", "a2"]);
  });

  it("falls back to bigger covers for large groups", () => {
    const rooms = [r("x", DOUBLE, 100), r("y", DOUBLE, 100), r("z", DOUBLE, 100)];
    const sets = rankRoomSetsForParty(party(6), rooms, P);
    expect(sets[0]).toHaveLength(3);
  });

  it("returns nothing when the family cannot be hosted", () => {
    expect(rankRoomSetsForParty(party(6), [r("x", DOUBLE, 100)], P)).toEqual([]);
  });
});

describe("cots, extra beds and the people limit", () => {
  const DOUBLE_COT: RoomCapacity = { ...DOUBLE, max_cots: 1 };
  const noBabiesInBed: ChildPolicy = { ...P, infantsWithParents: false };

  it("puts a baby in a cot when the parents' bed is not allowed", () => {
    const [room] = placeParty(party(2, [1]), [DOUBLE_COT], noBabiesInBed) ?? [];
    expect(room).toMatchObject({ cots: 1, extraBeds: 0, infantsWithParents: 0 });
  });

  it("prefers the parents' bed to a cot when allowed, so cots stay free", () => {
    const [room] = placeParty(party(2, [1]), [DOUBLE_COT], P) ?? [];
    expect(room).toMatchObject({ cots: 0, infantsWithParents: 1 });
  });

  it("never treats a cot as an extra bed", () => {
    // A 6-year-old cannot use the cot: with the child slot taken by a sibling, an extra bed is needed.
    expect(canRoomsHostParty(party(2, [5, 8]), [DOUBLE_COT], P)).toBe(false);
  });

  it("uses an extra bed only while the property has one free", () => {
    expect(canRoomsHostParty(party(2, [5, 8]), [DOUBLE_EXTRA], P, { extraBeds: 1, cots: 0 })).toBe(true);
    expect(canRoomsHostParty(party(2, [5, 8]), [DOUBLE_EXTRA], P, { extraBeds: 0, cots: 0 })).toBe(false);
  });

  it("uses a cot only while the property has one free", () => {
    expect(canRoomsHostParty(party(1, [0]), [{ ...room(1), max_cots: 1 }], noBabiesInBed, { extraBeds: 0, cots: 1 })).toBe(true);
    expect(canRoomsHostParty(party(1, [0]), [{ ...room(1), max_cots: 1 }], noBabiesInBed, { extraBeds: 0, cots: 0 })).toBe(false);
  });

  it("caps the people in a room, babies included", () => {
    const capped: RoomCapacity = { ...DOUBLE_EXTRA, max_occupancy: 3 };
    expect(canRoomsHostParty(party(2, [5]), [capped], P)).toBe(true);
    expect(canRoomsHostParty(party(2, [5, 1]), [capped], P)).toBe(false);
    expect(canRoomsHostParty(party(2, [5, 8]), [capped], P)).toBe(false);
  });

  it("arranges the family to use as few extra beds as the stock allows", () => {
    const family = party(4, [5, 8, 9, 10]);
    const rooms = [DOUBLE_EXTRA, DOUBLE_EXTRA];
    // 2 adults + 3 children in one room, 2 adults + 1 child in the other: one extra bed.
    const placed = placeParty(family, rooms, P, { extraBeds: 1, cots: 0 });
    expect(placed?.reduce((sum, r) => sum + r.extraBeds, 0)).toBe(1);
    expect(canRoomsHostParty(family, rooms, P, { extraBeds: 0, cots: 0 })).toBe(false);
  });
});

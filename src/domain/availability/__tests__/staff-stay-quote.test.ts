import { describe, expect, it } from "vitest";
import {
  buildStaffStaySuggestions,

  quoteStaffStaySelection,
  mergeStayRoomSelection,
  resolveStaffStaySelection,
  type StaffStayQuoteRoom,
} from "@/domain/availability/staff-stay-quote";
import type { StayPricingRules } from "@/domain/settings/booking-rules";
import { DEFAULT_CHILD_POLICY, type Party } from "@/domain/availability/party";

function adults(count: number, childAges: number[] = []): Party {
  return { adults: count, childAges, childrenSeparateRoom: false };
}

function room(
  id: string,
  name: string,
  capacity: number,
  price: number,
): StaffStayQuoteRoom {
  return {
    id,
    name,
    capacity_base: capacity,
    allows_extra_beds: false,
    max_extra_beds_per_room: 0,
    price_per_night: price,
  };
}

const STAY = {
  checkIn: "2026-09-10",
  checkOut: "2026-09-12",
} as const;

describe("mergeStayRoomSelection", () => {
  it("keeps previous rooms that are still free, otherwise falls back to preferred", () => {
    expect(mergeStayRoomSelection(["a"], ["a", "b"], ["c"])).toEqual(["a"]);
    expect(mergeStayRoomSelection(["gone"], ["b", "c"], ["c"])).toEqual(["c"]);
    expect(mergeStayRoomSelection([], ["a", "b"], ["b"])).toEqual(["b"]);
  });
});

describe("buildStaffStaySuggestions", () => {
  const rooms = [
    room("a", "101", 2, 100),
    room("b", "102", 2, 110),
    room("c", "201", 4, 250),
  ];

  it("puts hosting Gantt rooms first, then cheapest single, then a cheaper combo", () => {
    const suggestions = buildStaffStaySuggestions({
      availableRooms: rooms,
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      preferredIds: ["c"],
      ...STAY,
    });
    expect(suggestions.map((row) => row.kind)).toEqual(["preferred", "combo"]);
    expect(suggestions[0]?.roomIds).toEqual(["c"]);
    expect(suggestions[1]?.roomIds).toEqual(["a", "b"]);
    expect(suggestions[0]?.estimateRon).toBe(500);
    expect(suggestions[1]?.estimateRon).toBe(420);
  });

  it("skips preferred rooms that cannot host the party", () => {
    const suggestions = buildStaffStaySuggestions({
      availableRooms: rooms,
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      preferredIds: ["a"],
      ...STAY,
    });
    expect(suggestions.map((row) => row.kind)).toEqual(["cheapest_single", "combo"]);
    expect(suggestions[0]?.roomIds).toEqual(["c"]);
    expect(suggestions[1]?.roomIds).toEqual(["a", "b"]);
  });

  it("does not duplicate the cheapest single as a one-room combo", () => {
    const suggestions = buildStaffStaySuggestions({
      availableRooms: rooms,
      party: adults(2), policy: DEFAULT_CHILD_POLICY,
      preferredIds: [],
      ...STAY,
    });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.kind).toBe("cheapest_single");
    expect(suggestions[0]?.roomIds).toEqual(["a"]);
  });

  it("caps at three distinct options", () => {
    const many = [
      ...rooms,
      room("d", "301", 4, 400),
    ];
    const suggestions = buildStaffStaySuggestions({
      availableRooms: many,
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      preferredIds: ["d"],
      ...STAY,
    });
    expect(suggestions.map((row) => row.kind)).toEqual([
      "preferred",
      "cheapest_single",
      "combo",
    ]);
    expect(suggestions[0]?.roomIds).toEqual(["d"]);
    expect(suggestions[1]?.roomIds).toEqual(["c"]);
    expect(suggestions[2]?.roomIds).toEqual(["a", "b"]);
    expect(new Set(suggestions.map((row) => row.id)).size).toBe(3);
  });
});

describe("resolveStaffStaySelection", () => {
  const rooms = [
    room("a", "101", 2, 100),
    room("b", "102", 2, 110),
    room("c", "201", 4, 250),
  ];

  it("keeps a previous selection that still hosts", () => {
    expect(
      resolveStaffStaySelection({
        previousIds: ["a", "b"],
        availableRooms: rooms,
        preferredIds: ["c"],
        party: adults(3), policy: DEFAULT_CHILD_POLICY,
        ...STAY,
      }),
    ).toEqual(["a", "b"]);
  });

  it("falls back to the first suggestion when previous rooms cannot host", () => {
    expect(
      resolveStaffStaySelection({
        previousIds: ["a"],
        availableRooms: rooms,
        preferredIds: ["a"],
        party: adults(3), policy: DEFAULT_CHILD_POLICY,
        ...STAY,
      }),
    ).toEqual(["c"]);
  });

  it("preselects the cheapest hosting option when there is no Gantt preference", () => {
    expect(
      resolveStaffStaySelection({
        previousIds: [],
        availableRooms: rooms,
        preferredIds: [],
        party: adults(2), policy: DEFAULT_CHILD_POLICY,
        ...STAY,
      }),
    ).toEqual(["a"]);
  });
});

describe("quoteStaffStaySelection", () => {
  const rooms = [
    room("a", "101", 2, 100),
    room("b", "102", 2, 120),
    room("c", "201", 4, 200),
  ];

  it("quotes the same nightly total used on the public site", () => {
    const quote = quoteStaffStaySelection({
      availableRooms: rooms,
      selectedIds: ["c"],
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
    });
    expect(quote.hostsGuests).toBe(true);
    expect(quote.minRoomsNeeded).toBe(1);
    expect(quote.estimateRon).toBe(400);
    expect(quote.lines).toEqual([{ roomId: "c", roomName: "201", lineTotal: 400 }]);
  });

  it("requires enough selected capacity, not a fixed room count", () => {
    const tooSmall = quoteStaffStaySelection({
      availableRooms: rooms,
      selectedIds: ["a"],
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
    });
    expect(tooSmall.hostsGuests).toBe(false);
    expect(tooSmall.selectedCapacity).toBe(2);

    const combo = quoteStaffStaySelection({
      availableRooms: rooms,
      selectedIds: ["a", "b"],
      party: adults(3), policy: DEFAULT_CHILD_POLICY,
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
    });
    expect(combo.hostsGuests).toBe(true);
    expect(combo.estimateRon).toBe(440);
  });

  it("applies weekend pricing rules like confirm and public preview", () => {
    const rules: StayPricingRules = {
      weekendEnabled: true,
      weekendMode: "fri_sat",
      weekendMultiplier: 1.5,
      seasons: [],
    };
    // Thu 10 Sep + Fri 11 Sep 2026 — one weekend night in fri_sat mode.
    const quote = quoteStaffStaySelection({
      availableRooms: rooms,
      selectedIds: ["a"],
      party: adults(2), policy: DEFAULT_CHILD_POLICY,
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      pricingRules: rules,
    });
    expect(quote.estimateRon).toBe(250);
  });
});

describe("families", () => {
  const rooms = [
    room("a", "101", 2, 100),
    room("b", "102", 2, 100),
    room("c", "201", 4, 250),
  ];

  it("keeps parents and their child in one double instead of splitting", () => {
    const suggestions = buildStaffStaySuggestions({
      availableRooms: rooms,
      party: adults(2, [6]),
      policy: DEFAULT_CHILD_POLICY,
      preferredIds: [],
      ...STAY,
    });
    expect(suggestions.map((row) => row.roomIds)).toEqual([["a"]]);
  });

  it("quotes a double as hosting a family of four with two young children only with an extra bed", () => {
    const quote = quoteStaffStaySelection({
      availableRooms: rooms,
      selectedIds: ["a"],
      party: adults(2, [5, 8]),
      policy: DEFAULT_CHILD_POLICY,
      ...STAY,
    });
    expect(quote.hostsGuests).toBe(false);
    expect(quote.guestCount).toBe(4);
    expect(quote.minRoomsNeeded).toBe(1);
  });
});

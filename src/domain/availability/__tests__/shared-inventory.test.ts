import { describe, expect, it } from "vitest";
import { DEFAULT_CHILD_POLICY, type Party } from "@/domain/availability/party";
import {
  inventoryInUse,
  remainingInventory,
} from "@/domain/availability/shared-inventory";
import type { RoomCapacity } from "@/domain/availability/stay-capacity";
import { quoteStay } from "@/domain/availability/stay-quote";

const DOUBLE_EXTRA: RoomCapacity = {
  capacity_base: 2,
  allows_extra_beds: true,
  max_extra_beds_per_room: 1,
  max_cots: 1,
};

function family(childAges: number[]): Party {
  return { adults: 2, childAges, childrenSeparateRoom: false };
}

const rooms = new Map<string, RoomCapacity>([
  ["a", DOUBLE_EXTRA],
  ["b", DOUBLE_EXTRA],
]);

describe("inventoryInUse", () => {
  it("counts what other stays use on the busiest night", () => {
    const used = inventoryInUse({
      checkIn: "2026-07-01",
      checkOut: "2026-07-05",
      rooms,
      policy: { ...DEFAULT_CHILD_POLICY, infantsWithParents: false },
      stays: [
        {
          bookingId: "x",
          party: family([5, 8]),
          segments: [{ roomId: "a", checkIn: "2026-06-30", checkOut: "2026-07-03" }],
        },
        {
          bookingId: "y",
          party: family([1]),
          segments: [{ roomId: "b", checkIn: "2026-07-02", checkOut: "2026-07-04" }],
        },
      ],
    });
    // 2 July: x uses an extra bed, y a cot.
    expect(used).toEqual({ extraBeds: 1, cots: 1 });
    expect(remainingInventory({ extraBeds: 2, cots: 1 }, used)).toEqual({
      extraBeds: 1,
      cots: 0,
    });
  });

  it("ignores nights outside the stay", () => {
    const used = inventoryInUse({
      checkIn: "2026-07-03",
      checkOut: "2026-07-04",
      rooms,
      policy: DEFAULT_CHILD_POLICY,
      stays: [
        {
          bookingId: "x",
          party: family([5, 8]),
          segments: [{ roomId: "a", checkIn: "2026-06-30", checkOut: "2026-07-03" }],
        },
      ],
    });
    expect(used).toEqual({ extraBeds: 0, cots: 0 });
  });
});

describe("quoteStay", () => {
  const room = { ...DOUBLE_EXTRA, price_per_night: 200 };

  it("adds the extra bed fee only when the property charges one", () => {
    const base = {
      rooms: [room],
      party: family([5, 8]),
      policy: DEFAULT_CHILD_POLICY,
      checkIn: "2026-07-06",
      checkOut: "2026-07-08",
    };
    expect(quoteStay(base)?.total).toBe(400);
    const charged = quoteStay({
      ...base,
      pricingRules: {
        weekendEnabled: false,
        weekendMode: "fri_sat",
        weekendMultiplier: 1,
        seasons: [],
        extraBedFee: 50,
        cotFee: 20,
      },
    });
    expect(charged).toMatchObject({ roomsTotal: 400, extrasTotal: 100, total: 500 });
  });

  it("returns null when the rooms cannot host the family", () => {
    expect(
      quoteStay({
        rooms: [room],
        party: family([15, 16]),
        policy: DEFAULT_CHILD_POLICY,
        checkIn: "2026-07-06",
        checkOut: "2026-07-07",
      }),
    ).toBeNull();
  });
});

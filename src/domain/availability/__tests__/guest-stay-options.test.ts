import { describe, expect, it } from "vitest";
import { computeGuestStayOptions, type GuestOptionRoom } from "@/domain/availability/guest-stay-options";
import { DEFAULT_CHILD_POLICY } from "@/domain/availability/party";

function room(id: string, typeId: string, price: number): GuestOptionRoom {
  return {
    id,
    room_type_id: typeId,
    name: id,
    building_name: "Casa",
    has_ac: false,
    price_per_night: price,
    capacity_base: 2,
    allows_extra_beds: false,
    max_extra_beds_per_room: 0,
  };
}

// Six cheap doubles rank ahead of the pricier suite for two guests.
const rooms = [
  ...Array.from({ length: 6 }, (_, i) => room(`D${i + 1}`, "double", 200)),
  room("S1", "suite", 450),
];

function preview(prefer?: string) {
  return computeGuestStayOptions({
    rooms,
    occupied: [],
    checkIn: "2026-12-10",
    checkOut: "2026-12-12",
    party: { adults: 2, childAges: [], childrenSeparateRoom: false },
    policy: DEFAULT_CHILD_POLICY,
    times: { checkIn: "14:00", checkOut: "12:00" },
    preferRoomTypeId: prefer,
  });
}

describe("variants for a room picked on the site", () => {
  it("brings the picked room type onto the short list, first", () => {
    const plain = preview();
    expect(plain.options.some((o) => o.rooms.some((r) => r.room_type_id === "suite"))).toBe(false);

    const picked = preview("suite");
    expect(picked.options[0]?.rooms.map((r) => r.id)).toEqual(["S1"]);
    expect(picked.options.length).toBe(plain.options.length);
  });

  it("still offers the rest when the picked type is taken", () => {
    const taken = computeGuestStayOptions({
      rooms,
      occupied: [{ room_id: "S1", check_in: "2026-12-09", check_out: "2026-12-13" }],
      checkIn: "2026-12-10",
      checkOut: "2026-12-12",
      party: { adults: 2, childAges: [], childrenSeparateRoom: false },
      policy: DEFAULT_CHILD_POLICY,
      times: { checkIn: "14:00", checkOut: "12:00" },
      preferRoomTypeId: "suite",
    });
    expect(taken.options.length).toBeGreaterThan(0);
    expect(taken.options.every((o) => o.rooms.every((r) => r.room_type_id === "double"))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { occupantCheckinSlots } from "@/domain/booking/occupants";

describe("occupantCheckinSlots", () => {
  it("maps each occupant to the selected room name", () => {
    expect(
      occupantCheckinSlots(
        [
          { roomId: "r1", guestId: "g1", isRepresentative: true },
          { roomId: "r2", guestId: "g2", isRepresentative: false },
        ],
        [
          { id: "r1", name: "101" },
          { id: "r2", name: "102" },
        ]
      )
    ).toEqual([
      { guestId: "g1", roomLabel: "101", isRepresentative: true },
      { guestId: "g2", roomLabel: "102", isRepresentative: false },
    ]);
  });
});

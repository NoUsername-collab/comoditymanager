import { describe, expect, it } from "vitest";
import {
  deriveActiveBookings,
  deriveFilteredRooms,
  deriveGanttFocusIso,
} from "../calendar-derivations";
import type { GanttRoom } from "../types";

describe("calendar-derivations", () => {
  it("filters cancelled bookings", () => {
    const active = deriveActiveBookings([
      { status: "confirmata", room_ids: ["r1"] } as never,
      { status: "anulata", room_ids: ["r2"] } as never,
    ]);
    expect(active).toHaveLength(1);
    expect(active[0].room_ids).toEqual(["r1"]);
  });

  it("derives focus iso from filter", () => {
    expect(
      deriveGanttFocusIso(["2026-06-01", "2026-06-02"], "2026-06-01", "all", null)
    ).toBe("2026-06-01");
    expect(
      deriveGanttFocusIso(
        ["2026-06-01", "2026-06-02"],
        "2026-06-01",
        "occupied",
        "2026-06-02"
      )
    ).toBe("2026-06-02");
  });

  it("filters free rooms on focus day", () => {
    const rooms: GanttRoom[] = [
      { id: "r1", building_id: "b1" } as GanttRoom,
      { id: "r2", building_id: "b1" } as GanttRoom,
    ];
    const occupied = new Set(["r1"]);
    const free = deriveFilteredRooms(rooms, "free", occupied);
    expect(free.map((r) => r.id)).toEqual(["r2"]);
  });
});

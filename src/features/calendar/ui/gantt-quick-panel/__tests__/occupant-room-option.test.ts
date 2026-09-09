import { describe, expect, it } from "vitest";
import { occupantRoomOptionLabel } from "@/features/calendar/ui/gantt-quick-panel/occupant-room-option";

describe("occupantRoomOptionLabel", () => {
  it("marks the first room as titular and incomplete until a name exists", () => {
    expect(
      occupantRoomOptionLabel({
        roomName: "101",
        isTitular: true,
        titularLabel: "titular",
        incompleteLabel: "—",
      }),
    ).toBe("101 · titular · —");
  });

  it("appends the guest name when either name is filled", () => {
    expect(
      occupantRoomOptionLabel({
        roomName: "102",
        isTitular: false,
        titularLabel: "titular",
        lastName: "Popescu",
        firstName: "Ion",
        incompleteLabel: "—",
      }),
    ).toBe("102 · Popescu Ion");
  });
});

import { describe, expect, it } from "vitest";
import { ganttCreateActionsDisabled, ganttCreateDraftFromMenu } from "../actions";
import type { GanttCreateTarget } from "@/domain/gantt/context-menu";

function createTarget(
  overrides: Partial<GanttCreateTarget> = {}
): GanttCreateTarget {
  return {
    kind: "create",
    clientX: 10,
    clientY: 20,
    roomId: "r1",
    roomName: "101",
    checkIn: "2026-09-10",
    checkOut: "2026-09-12",
    hasConflict: false,
    ...overrides,
  };
}

describe("ganttCreateActionsDisabled", () => {
  it("enables all four actions for a free single room", () => {
    expect(ganttCreateActionsDisabled(createTarget(), false)).toEqual({
      request: false,
      direct: false,
      hold: false,
      block: false,
    });
  });

  it("allows request, direct stay, and hold for a multi-room selection", () => {
    expect(
      ganttCreateActionsDisabled(
        createTarget({ roomIds: ["r1", "r2"] }),
        false
      )
    ).toEqual({
      request: false,
      direct: false,
      hold: false,
      block: true,
    });
  });

  it("disables every action on conflict or missing room", () => {
    expect(
      ganttCreateActionsDisabled(createTarget({ hasConflict: true }), false)
    ).toEqual({
      request: true,
      direct: true,
      hold: true,
      block: true,
    });
    expect(
      ganttCreateActionsDisabled(createTarget({ roomId: null }), false)
    ).toEqual({
      request: true,
      direct: true,
      hold: true,
      block: true,
    });
  });
});

describe("ganttCreateDraftFromMenu", () => {
  it("copies the interval and selected action", () => {
    expect(ganttCreateDraftFromMenu(createTarget(), "request", "Cameră")).toEqual({
      roomId: "r1",
      roomName: "101",
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      hasConflict: false,
      initialMode: "request",
    });
  });
});

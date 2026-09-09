import { describe, expect, it } from "vitest";
import {
  dismissClearsPinnedSelection,
  pinnedSelectionFromRange,
  shouldClearPinnedOnCreateMenuEvent,
} from "@/domain/gantt/pinned-selection";

describe("pinnedSelectionFromRange", () => {
  it("replaces rooms instead of toggling", () => {
    expect(
      pinnedSelectionFromRange(["r2", "r2", "r1"], "2026-09-10", "2026-09-12")
    ).toEqual({
      roomIds: ["r2", "r1"],
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
    });
  });

  it("returns null when there are no rooms", () => {
    expect(pinnedSelectionFromRange([], "2026-09-10", "2026-09-12")).toBeNull();
    expect(pinnedSelectionFromRange([""], "2026-09-10", "2026-09-12")).toBeNull();
  });
});

describe("create menu pin lifetime", () => {
  it("keeps the highlight while the menu is open", () => {
    expect(shouldClearPinnedOnCreateMenuEvent("open")).toBe(false);
  });

  it("clears the highlight on outside dismiss, Escape, or picking an action", () => {
    expect(shouldClearPinnedOnCreateMenuEvent("dismiss-outside")).toBe(true);
    expect(shouldClearPinnedOnCreateMenuEvent("dismiss-escape")).toBe(true);
    expect(shouldClearPinnedOnCreateMenuEvent("pick-action")).toBe(true);
  });

  it("clears the pin only when dismissing a create menu", () => {
    expect(dismissClearsPinnedSelection("create")).toBe(true);
    expect(dismissClearsPinnedSelection("stay")).toBe(false);
    expect(dismissClearsPinnedSelection("hold")).toBe(false);
    expect(dismissClearsPinnedSelection(undefined)).toBe(false);
  });
});

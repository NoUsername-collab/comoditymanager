import { describe, expect, test } from "vitest";
import {
  computeRoomCheckinProgress,
  isRoomCheckedIn,
} from "../room-checkin-progress";

describe("room-checkin-progress", () => {
  test("multi-room partial progress", () => {
    const p = computeRoomCheckinProgress(
      ["Camera 1", "Camera 2", "Camera 3"],
      ["Camera 1"],
    );
    expect(p.total).toBe(3);
    expect(p.checked).toBe(1);
    expect(p.remaining).toBe(2);
    expect(p.isPartial).toBe(true);
    expect(p.isComplete).toBe(false);
    expect(p.pendingRooms).toEqual(["Camera 2", "Camera 3"]);
  });

  test("case-insensitive room match", () => {
    expect(isRoomCheckedIn("Camera 1", ["camera 1"])).toBe(true);
  });

  test("single implicit room when no room names", () => {
    expect(computeRoomCheckinProgress([], []).remaining).toBe(1);
    expect(computeRoomCheckinProgress([], ["—"]).isComplete).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildBulkRoomNames,
  normalizeRoomNameKey,
  findDuplicateRoomNames,
} from "@/domain/room/bulk-names";

// ---------------------------------------------------------------------------
// buildBulkRoomNames
// ---------------------------------------------------------------------------
describe("buildBulkRoomNames", () => {
  it("generates prefixed names in 'prefix' mode", () => {
    // The prefix is trimmed, so "Camera " becomes "Camera" before appending the number
    const result = buildBulkRoomNames("prefix", "Camera ", 1, 3);
    expect(result).toEqual(["Camera1", "Camera2", "Camera3"]);
  });

  it("generates number-only names in 'number_only' mode", () => {
    const result = buildBulkRoomNames("number_only", "Camera ", 1, 3);
    expect(result).toEqual(["1", "2", "3"]);
  });

  it("returns empty array when count is 0", () => {
    expect(buildBulkRoomNames("prefix", "Room ", 1, 0)).toEqual([]);
  });

  it("uses just numbers when prefix is empty in prefix mode", () => {
    const result = buildBulkRoomNames("prefix", "", 5, 2);
    expect(result).toEqual(["5", "6"]);
  });

  it("starts from the specified startNumber", () => {
    const result = buildBulkRoomNames("prefix", "R", 10, 3);
    expect(result).toEqual(["R10", "R11", "R12"]);
  });

  it("trims prefix whitespace", () => {
    const result = buildBulkRoomNames("prefix", "  Room  ", 1, 1);
    // "  Room  " is trimmed to "Room", then "Room1"
    expect(result).toEqual(["Room1"]);
  });
});

// ---------------------------------------------------------------------------
// normalizeRoomNameKey
// ---------------------------------------------------------------------------
describe("normalizeRoomNameKey", () => {
  it("trims and lowercases", () => {
    expect(normalizeRoomNameKey("  Camera 1 ")).toBe("camera 1");
  });

  it("handles empty string", () => {
    expect(normalizeRoomNameKey("")).toBe("");
  });

  it("lowercases mixed-case input", () => {
    expect(normalizeRoomNameKey("Suite DELUXE")).toBe("suite deluxe");
  });
});

// ---------------------------------------------------------------------------
// findDuplicateRoomNames
// ---------------------------------------------------------------------------
describe("findDuplicateRoomNames", () => {
  it("finds duplicates between proposed and existing names", () => {
    const existing = ["Camera 1", "Camera 2"];
    const proposed = ["Camera 3", "Camera 1"];
    const result = findDuplicateRoomNames(existing, proposed);
    expect(result).toEqual(["Camera 1"]);
  });

  it("finds duplicates within proposed names", () => {
    const proposed = ["Room A", "Room B", "Room A"];
    const result = findDuplicateRoomNames([], proposed);
    expect(result).toEqual(["Room A"]);
  });

  it("returns empty when there are no duplicates", () => {
    const result = findDuplicateRoomNames(["Room 1"], ["Room 2", "Room 3"]);
    expect(result).toEqual([]);
  });

  it("performs case-insensitive comparison", () => {
    const existing = ["camera 1"];
    const proposed = ["Camera 1"];
    const result = findDuplicateRoomNames(existing, proposed);
    expect(result).toEqual(["Camera 1"]);
  });

  it("ignores empty/whitespace-only names", () => {
    const result = findDuplicateRoomNames([], ["  ", ""]);
    expect(result).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildBulkRoomNames,
  floorLevelFromStructure,
  floorNumberPrefix,
  joinRoomPrefix,
  normalizeRoomNameKey,
  findDuplicateRoomNames,
  suggestNextBulkStartNumber,
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

  it("numbers a floor stem so room 10 is 110, not 1010", () => {
    expect(joinRoomPrefix("10", 1)).toBe("101");
    expect(joinRoomPrefix("10", 10)).toBe("110");
    expect(buildBulkRoomNames("prefix", "10", 1, 10)).toEqual([
      "101",
      "102",
      "103",
      "104",
      "105",
      "106",
      "107",
      "108",
      "109",
      "110",
    ]);
  });

  it("uses the same stem on higher floors", () => {
    expect(floorNumberPrefix(1)).toBe("10");
    expect(floorNumberPrefix(2)).toBe("20");
    expect(floorNumberPrefix(12)).toBe("120");
    expect(joinRoomPrefix("20", 10)).toBe("210");
    expect(joinRoomPrefix("120", 3)).toBe("1203");
    expect(floorNumberPrefix(0)).toBeNull();
  });

  it("reads the floor level from the stored number, then from the name", () => {
    expect(floorLevelFromStructure(1, "Parter")).toBe(1);
    expect(floorLevelFromStructure(null, "Etaj 2")).toBe(2);
    expect(floorLevelFromStructure(null, "Parter")).toBeNull();
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

describe("suggestNextBulkStartNumber", () => {
  it("continues after prefixed bulk names", () => {
    expect(
      suggestNextBulkStartNumber(
        ["Camera1", "Camera2", "Camera10"],
        "prefix",
        "Camera "
      )
    ).toBe(11);
  });

  it("continues after number-only names", () => {
    expect(suggestNextBulkStartNumber(["1", "2", "5"], "number_only", "")).toBe(
      6
    );
  });

  it("continues a floor stem after 110", () => {
    expect(suggestNextBulkStartNumber(["101", "102", "110"], "prefix", "10")).toBe(
      11
    );
  });

  it("ignores a concatenated 1010 when suggesting the next room", () => {
    expect(suggestNextBulkStartNumber(["101", "1010"], "prefix", "10")).toBe(2);
  });

  it("returns 1 when building has no matching names", () => {
    expect(
      suggestNextBulkStartNumber(["Suite A"], "prefix", "Camera ")
    ).toBe(1);
  });
});

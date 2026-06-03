import { describe, it, expect } from "vitest";
import { parseGuestTags, toggleGuestTag } from "@/domain/guest/tags";

// ---------------------------------------------------------------------------
// parseGuestTags
// ---------------------------------------------------------------------------
describe("parseGuestTags", () => {
  it("filters to valid tags from a mixed array", () => {
    expect(parseGuestTags(["vip", "recurrent", "invalid", "other"])).toEqual([
      "vip",
      "recurrent",
    ]);
  });

  it("returns only valid tags", () => {
    expect(parseGuestTags(["vip"])).toEqual(["vip"]);
    expect(parseGuestTags(["recurrent"])).toEqual(["recurrent"]);
  });

  it("filters out invalid values", () => {
    expect(parseGuestTags(["foo", "bar", 123, null, undefined])).toEqual([]);
  });

  it("returns empty array for non-array input (string)", () => {
    expect(parseGuestTags("vip")).toEqual([]);
  });

  it("returns empty array for non-array input (null)", () => {
    expect(parseGuestTags(null)).toEqual([]);
  });

  it("returns empty array for non-array input (undefined)", () => {
    expect(parseGuestTags(undefined)).toEqual([]);
  });

  it("returns empty array for non-array input (number)", () => {
    expect(parseGuestTags(42)).toEqual([]);
  });

  it("returns empty array for non-array input (object)", () => {
    expect(parseGuestTags({ vip: true })).toEqual([]);
  });

  it("returns empty array for empty array", () => {
    expect(parseGuestTags([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// toggleGuestTag
// ---------------------------------------------------------------------------
describe("toggleGuestTag", () => {
  it("adds a tag that is not present", () => {
    expect(toggleGuestTag([], "vip")).toEqual(["vip"]);
  });

  it("adds a second tag", () => {
    expect(toggleGuestTag(["vip"], "recurrent")).toEqual(["vip", "recurrent"]);
  });

  it("removes an existing tag", () => {
    expect(toggleGuestTag(["vip", "recurrent"], "vip")).toEqual(["recurrent"]);
  });

  it("removes the only tag", () => {
    expect(toggleGuestTag(["recurrent"], "recurrent")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { roomMatchesFeatureFilter } from "@/domain/room/feature-filter";

describe("roomMatchesFeatureFilter", () => {
  it("matches all rooms when filter is all", () => {
    expect(roomMatchesFeatureFilter({}, "all")).toBe(true);
  });

  it("treats has_ac as the ac slug", () => {
    expect(roomMatchesFeatureFilter({ has_ac: true }, "ac")).toBe(true);
    expect(roomMatchesFeatureFilter({ has_ac: false }, "ac")).toBe(false);
  });

  it("matches option slugs", () => {
    expect(
      roomMatchesFeatureFilter({ option_slugs: ["fridge"] }, "fridge")
    ).toBe(true);
  });
});

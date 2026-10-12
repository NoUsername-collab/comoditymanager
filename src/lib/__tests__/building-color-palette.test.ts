import { describe, it, expect } from "vitest";
import {
  BUILDING_COLOR_PALETTE,
  defaultColorForAcMode,
  normalizeBuildingColor,
  isAllowedBuildingColor,
  resolveGanttBuildingColor,
  resolveSubmittedBuildingColor,
} from "@/lib/building-color-palette";

// ---------------------------------------------------------------------------
// BUILDING_COLOR_PALETTE
// ---------------------------------------------------------------------------
describe("BUILDING_COLOR_PALETTE", () => {
  it("has 10 entries", () => {
    expect(BUILDING_COLOR_PALETTE).toHaveLength(10);
  });

  it("every entry has a valid hex and a label", () => {
    for (const entry of BUILDING_COLOR_PALETTE) {
      expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// defaultColorForAcMode
// ---------------------------------------------------------------------------
describe("defaultColorForAcMode", () => {
  it('returns blue for "all_rooms"', () => {
    expect(defaultColorForAcMode("all_rooms")).toBe("#2563eb");
  });

  it('returns orange for "none"', () => {
    expect(defaultColorForAcMode("none")).toBe("#ea580c");
  });

  it('returns green for "per_room"', () => {
    expect(defaultColorForAcMode("per_room")).toBe("#059669");
  });
});

// ---------------------------------------------------------------------------
// normalizeBuildingColor
// ---------------------------------------------------------------------------
describe("normalizeBuildingColor", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(normalizeBuildingColor(null)).toBeNull();
    expect(normalizeBuildingColor(undefined)).toBeNull();
    expect(normalizeBuildingColor("")).toBeNull();
    expect(normalizeBuildingColor("   ")).toBeNull();
  });

  it("returns the hex if it is in the allowed palette", () => {
    expect(normalizeBuildingColor("#2563eb")).toBe("#2563eb");
  });

  it("handles input without # prefix", () => {
    expect(normalizeBuildingColor("2563eb")).toBe("#2563eb");
  });

  it("handles uppercase input", () => {
    expect(normalizeBuildingColor("#2563EB")).toBe("#2563eb");
  });

  it("accepts any valid hex, including colors outside the palette", () => {
    expect(normalizeBuildingColor("#ffffff")).toBe("#ffffff");
    expect(normalizeBuildingColor("#abc")).toBe("#aabbcc");
  });

  it("returns null for an invalid hex", () => {
    expect(normalizeBuildingColor("#gggggg")).toBeNull();
    expect(normalizeBuildingColor("hello")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSubmittedBuildingColor
// ---------------------------------------------------------------------------
describe("resolveSubmittedBuildingColor", () => {
  it("uses palette colors when submitted", () => {
    expect(resolveSubmittedBuildingColor("#2563eb", "none")).toBe("#2563eb");
  });

  it("keeps a custom hex the property chose", () => {
    expect(resolveSubmittedBuildingColor("#ffffff", "none")).toBe("#ffffff");
    expect(resolveSubmittedBuildingColor("abc", "per_room")).toBe("#aabbcc");
  });

  it("falls back to the AC default when the hex is invalid", () => {
    expect(resolveSubmittedBuildingColor("nope", "none")).toBe("#ea580c");
  });
});

// ---------------------------------------------------------------------------
// isAllowedBuildingColor
// ---------------------------------------------------------------------------
describe("isAllowedBuildingColor", () => {
  it("returns true for palette colors", () => {
    expect(isAllowedBuildingColor("#2563eb")).toBe(true);
    expect(isAllowedBuildingColor("#dc2626")).toBe(true);
  });

  it("returns true for any valid hex", () => {
    expect(isAllowedBuildingColor("#000000")).toBe(true);
  });

  it("returns false for an invalid hex", () => {
    expect(isAllowedBuildingColor("nope")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveGanttBuildingColor
// ---------------------------------------------------------------------------
describe("resolveGanttBuildingColor", () => {
  it("returns the color when it is in the palette", () => {
    expect(resolveGanttBuildingColor("#2563eb", "none")).toBe("#2563eb");
  });

  it("falls back to AC mode default when color is null", () => {
    expect(resolveGanttBuildingColor(null, "all_rooms")).toBe("#2563eb");
    expect(resolveGanttBuildingColor(null, "none")).toBe("#ea580c");
    expect(resolveGanttBuildingColor(null, "per_room")).toBe("#059669");
  });

  it("keeps a custom hex on the calendar", () => {
    expect(resolveGanttBuildingColor("#ffffff", "none")).toBe("#ffffff");
  });

  it("falls back to the AC default when the stored color is invalid", () => {
    expect(resolveGanttBuildingColor("nope", "none")).toBe("#ea580c");
  });
});

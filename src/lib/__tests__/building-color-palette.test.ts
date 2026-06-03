import { describe, it, expect } from "vitest";
import {
  BUILDING_COLOR_PALETTE,
  defaultColorForAcMode,
  normalizeBuildingColor,
  isAllowedBuildingColor,
  resolveGanttBuildingColor,
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

  it("returns null for a valid hex not in the palette", () => {
    expect(normalizeBuildingColor("#ffffff")).toBeNull();
  });

  it("returns null for an invalid hex", () => {
    expect(normalizeBuildingColor("#gggggg")).toBeNull();
    expect(normalizeBuildingColor("hello")).toBeNull();
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

  it("returns false for non-palette colors", () => {
    expect(isAllowedBuildingColor("#000000")).toBe(false);
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

  it("falls back to AC mode default when color is not in palette", () => {
    expect(resolveGanttBuildingColor("#ffffff", "none")).toBe("#ea580c");
  });
});

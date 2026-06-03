import { describe, it, expect } from "vitest";
import {
  occupancyPercent,
  availabilityPressure,
  pressureLabel,
  heatLevelClass,
} from "@/domain/availability/heat";

// ---------------------------------------------------------------------------
// occupancyPercent
// ---------------------------------------------------------------------------

describe("occupancyPercent", () => {
  it("returns 50 for 5 occupied out of 10", () => {
    expect(occupancyPercent(5, 10)).toBe(50);
  });

  it("returns 0 for 0 occupied out of 10", () => {
    expect(occupancyPercent(0, 10)).toBe(0);
  });

  it("returns 100 for 10 occupied out of 10", () => {
    expect(occupancyPercent(10, 10)).toBe(100);
  });

  it("returns 0 when total is 0", () => {
    expect(occupancyPercent(5, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// availabilityPressure
// ---------------------------------------------------------------------------

describe("availabilityPressure", () => {
  it('returns "full" when 0 rooms are free', () => {
    expect(availabilityPressure(0, 10)).toBe("full");
  });

  it('returns "tight" when exactly 1 room is free', () => {
    expect(availabilityPressure(1, 10)).toBe("tight");
  });

  it('returns "moderate" when 2 rooms are free out of 10', () => {
    expect(availabilityPressure(2, 10)).toBe("moderate");
  });

  it('returns "relaxed" when 5 rooms are free out of 10', () => {
    expect(availabilityPressure(5, 10)).toBe("relaxed");
  });

  it('returns "full" when totalRooms is 0', () => {
    expect(availabilityPressure(0, 0)).toBe("full");
  });

  it('returns "moderate" when ratio is 25% or less (e.g. 3 free out of 12)', () => {
    expect(availabilityPressure(3, 12)).toBe("moderate");
  });
});

// ---------------------------------------------------------------------------
// pressureLabel
// ---------------------------------------------------------------------------

describe("pressureLabel", () => {
  it('returns correct label for "relaxed"', () => {
    expect(pressureLabel("relaxed")).toBe("Good availability");
  });

  it('returns correct label for "moderate"', () => {
    expect(pressureLabel("moderate")).toBe("Moderate pressure");
  });

  it('returns correct label for "tight"', () => {
    expect(pressureLabel("tight")).toBe("Almost full");
  });

  it('returns correct label for "full"', () => {
    expect(pressureLabel("full")).toBe("Fully occupied");
  });
});

// ---------------------------------------------------------------------------
// heatLevelClass
// ---------------------------------------------------------------------------

describe("heatLevelClass", () => {
  it('returns "avail-heat-cell--full" when 0 rooms free', () => {
    expect(heatLevelClass(0, 10)).toBe("avail-heat-cell--full");
  });

  it('returns "avail-heat-cell--tight" when 1 room free', () => {
    expect(heatLevelClass(1, 10)).toBe("avail-heat-cell--tight");
  });

  it('returns "avail-heat-cell--moderate" when 2 rooms free out of 10', () => {
    expect(heatLevelClass(2, 10)).toBe("avail-heat-cell--moderate");
  });

  it('returns "avail-heat-cell--relaxed" when 5 rooms free out of 10', () => {
    expect(heatLevelClass(5, 10)).toBe("avail-heat-cell--relaxed");
  });
});

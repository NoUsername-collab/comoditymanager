import { describe, it, expect } from "vitest";
import {
  computeStandardStayTotal,
  isWeekendNight,
  resolveNightlyRate,
  seasonMultiplierForNight,
} from "@/domain/pricing/nightly-rates";
import type { StayPricingRules } from "@/domain/settings/booking-rules";

describe("isWeekendNight", () => {
  it("detects fri_sat mode", () => {
    expect(isWeekendNight("2025-06-06", "fri_sat")).toBe(true);
    expect(isWeekendNight("2025-06-07", "fri_sat")).toBe(true);
    expect(isWeekendNight("2025-06-05", "fri_sat")).toBe(false);
  });

  it("detects sat_only mode", () => {
    expect(isWeekendNight("2025-06-06", "sat_only")).toBe(false);
    expect(isWeekendNight("2025-06-07", "sat_only")).toBe(true);
  });
});

describe("seasonMultiplierForNight", () => {
  it("applies season multiplier inside range", () => {
    const mult = seasonMultiplierForNight("2025-07-15", [
      {
        id: "s1",
        name: "Vară",
        startMonth: 6,
        startDay: 1,
        endMonth: 8,
        endDay: 31,
        multiplier: 1.3,
      },
    ]);
    expect(mult).toBe(1.3);
  });
});

describe("computeStandardStayTotal", () => {
  const rules: StayPricingRules = {
    weekendEnabled: true,
    weekendMode: "fri_sat",
    weekendMultiplier: 1.2,
    seasons: [],
  };

  it("applies weekend multiplier per night", () => {
    const total = computeStandardStayTotal(
      [{ price_per_night: 100 }],
      "2025-06-05",
      "2025-06-08",
      rules
    );
    expect(total).toBe(340);
  });

  it("falls back to flat pricing without rules", () => {
    expect(
      computeStandardStayTotal([{ price_per_night: 100 }], "2025-06-05", "2025-06-08")
    ).toBe(300);
  });
});

describe("resolveNightlyRate", () => {
  it("stacks weekend and season", () => {
    const line = resolveNightlyRate(100, "2025-07-04", {
      weekendEnabled: true,
      weekendMode: "fri_sat",
      weekendMultiplier: 1.1,
      seasons: [
        {
          id: "s1",
          name: "Vară",
          startMonth: 7,
          startDay: 1,
          endMonth: 7,
          endDay: 31,
          multiplier: 1.2,
        },
      ],
    });
    expect(line.applied_rate).toBe(132);
  });
});

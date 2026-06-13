import { describe, it, expect } from "vitest";
import {
  computeAdrRon,
  computeRevparRon,
  computeRevenueKpis,
} from "@/domain/statistics/kpi-metrics";

describe("computeAdrRon", () => {
  it("returns revenue divided by occupied room nights", () => {
    expect(computeAdrRon(2100, 7)).toBe(300);
  });

  it("returns null when occupied nights are zero", () => {
    expect(computeAdrRon(1000, 0)).toBeNull();
  });

  it("returns null when revenue is zero", () => {
    expect(computeAdrRon(0, 10)).toBeNull();
  });
});

describe("computeRevparRon", () => {
  it("returns revenue divided by capacity room nights", () => {
    expect(computeRevparRon(3000, 30)).toBe(100);
  });

  it("returns null when capacity is zero", () => {
    expect(computeRevparRon(1000, 0)).toBeNull();
  });
});

describe("computeRevenueKpis", () => {
  it("returns both ADR and RevPAR", () => {
    expect(
      computeRevenueKpis({
        revenueRon: 600,
        roomNightsOccupied: 6,
        roomNightsCapacity: 20,
      })
    ).toEqual({
      adrRon: 100,
      revparRon: 30,
    });
  });
});

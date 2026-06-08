import { describe, expect, it } from "vitest";
import { stayNightProgress } from "@/domain/gantt/stay-progress";

describe("stayNightProgress", () => {
  it("returns null for invalid stay", () => {
    expect(stayNightProgress("2025-06-10", "2025-06-10", "2025-06-10")).toBeNull();
  });

  it("returns 0% before check-in", () => {
    expect(stayNightProgress("2025-06-10", "2025-06-13", "2025-06-09")).toEqual({
      total: 3,
      current: 0,
      pct: 0,
    });
  });

  it("returns mid-stay progress", () => {
    expect(stayNightProgress("2025-06-10", "2025-06-13", "2025-06-11")).toEqual({
      total: 3,
      current: 2,
      pct: (2 / 3) * 100,
    });
  });

  it("returns 100% on or after check-out", () => {
    expect(stayNightProgress("2025-06-10", "2025-06-13", "2025-06-13")).toEqual({
      total: 3,
      current: 3,
      pct: 100,
    });
  });
});

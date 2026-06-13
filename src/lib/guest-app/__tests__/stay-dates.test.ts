import { describe, expect, it } from "vitest";
import { daysUntilDate, stayProgressRatio } from "../stay-dates";

describe("daysUntilDate", () => {
  it("counts days until target", () => {
    expect(daysUntilDate("2026-06-10", "2026-06-12")).toBe(2);
    expect(daysUntilDate("2026-06-12", "2026-06-12")).toBe(0);
  });
});

describe("stayProgressRatio", () => {
  it("returns 0 on check-in day", () => {
    expect(
      stayProgressRatio({
        today: "2026-06-10",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
      }),
    ).toBe(0);
  });

  it("returns 1 on check-out day", () => {
    expect(
      stayProgressRatio({
        today: "2026-06-12",
        checkIn: "2026-06-10",
        checkOut: "2026-06-12",
      }),
    ).toBe(1);
  });
});

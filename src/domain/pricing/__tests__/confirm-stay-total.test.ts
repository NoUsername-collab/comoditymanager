import { describe, it, expect } from "vitest";
import { computeStandardStayTotal } from "@/domain/pricing/confirm-stay-total";

describe("computeStandardStayTotal", () => {
  it("calculates total for a single room, 1 night", () => {
    const rooms = [{ price_per_night: 200 }];
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-11")).toBe(200);
  });

  it("calculates total for a single room, multiple nights", () => {
    const rooms = [{ price_per_night: 150 }];
    // 3 nights: June 10, 11, 12
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-13")).toBe(450);
  });

  it("calculates total for multiple rooms, multiple nights", () => {
    const rooms = [{ price_per_night: 100 }, { price_per_night: 200 }];
    // 2 nights: (100 + 200) * 2 = 600
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-12")).toBe(600);
  });

  it("returns 0 when checkIn equals checkOut (zero nights)", () => {
    const rooms = [{ price_per_night: 100 }];
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-10")).toBe(0);
  });

  it("rounds decimal prices to 2 decimal places", () => {
    // 33.33 * 3 = 99.99
    const rooms = [{ price_per_night: 33.33 }];
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-13")).toBe(99.99);
  });

  it("rounds correctly when result has floating-point imprecision", () => {
    // 0.1 + 0.2 style scenario: 19.99 * 3 = 59.97
    const rooms = [{ price_per_night: 19.99 }];
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-13")).toBe(59.97);
  });

  it("returns 0 for an empty rooms array", () => {
    expect(computeStandardStayTotal([], "2025-06-10", "2025-06-12")).toBe(0);
  });

  it("returns 0 when price_per_night is 0", () => {
    const rooms = [{ price_per_night: 0 }];
    expect(computeStandardStayTotal(rooms, "2025-06-10", "2025-06-13")).toBe(0);
  });
});

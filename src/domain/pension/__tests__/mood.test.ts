import { describe, test, expect } from "vitest";
import { computePensionMood } from "../mood";

describe("computePensionMood", () => {
  test("calm when no operational pressure", () => {
    expect(
      computePensionMood({
        cereriCount: 0,
        unpaidInHouseCount: 0,
        pendingCheckIns: 0,
      })
    ).toBe("calm");
  });

  test("active when cereri or pending arrivals", () => {
    expect(
      computePensionMood({
        cereriCount: 2,
        unpaidInHouseCount: 0,
        pendingCheckIns: 0,
      })
    ).toBe("active");

    expect(
      computePensionMood({
        cereriCount: 0,
        unpaidInHouseCount: 0,
        pendingCheckIns: 1,
      })
    ).toBe("active");
  });

  test("alert when in-house guests unpaid (overrides active)", () => {
    expect(
      computePensionMood({
        cereriCount: 5,
        unpaidInHouseCount: 1,
        pendingCheckIns: 3,
      })
    ).toBe("alert");
  });
});

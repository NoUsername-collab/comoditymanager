import { describe, expect, it } from "vitest";
import {
  parseExtraBedsMax,
  parseOperationalHours,
} from "@/domain/settings/operational-hours";

describe("parseOperationalHours", () => {
  it("accepts a typical same-day hotel window", () => {
    expect(
      parseOperationalHours({
        checkInTime: "14:00:00",
        checkOutTime: "11:00",
      }),
    ).toEqual({
      ok: true,
      data: {
        checkInTime: "14:00",
        checkOutTime: "11:00",
      },
    });
  });

  it("rejects checkout that is not before check-in", () => {
    expect(
      parseOperationalHours({
        checkInTime: "12:00",
        checkOutTime: "12:00",
      }).ok,
    ).toBe(false);
    expect(
      parseOperationalHours({
        checkInTime: "10:00",
        checkOutTime: "14:00",
      }),
    ).toMatchObject({ ok: false, error: "settings.checkout_must_be_before_checkin" });
  });

  it("rejects invalid clocks", () => {
    expect(
      parseOperationalHours({
        checkInTime: "25:00",
        checkOutTime: "11:00",
      }).ok,
    ).toBe(false);
  });
});

describe("parseExtraBedsMax", () => {
  it("accepts a whole number from 0 to 999", () => {
    expect(parseExtraBedsMax(0)).toEqual({ ok: true, data: { extraBedsMax: 0 } });
    expect(parseExtraBedsMax("12")).toEqual({ ok: true, data: { extraBedsMax: 12 } });
  });

  it("rejects fractions and values outside 0–999", () => {
    expect(parseExtraBedsMax(-1)).toMatchObject({
      ok: false,
      error: "settings.invalid_extra_beds",
    });
    expect(parseExtraBedsMax(1.5).ok).toBe(false);
    expect(parseExtraBedsMax(1000).ok).toBe(false);
  });
});

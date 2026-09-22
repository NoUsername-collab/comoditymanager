import { describe, expect, it } from "vitest";
import { parseOperationalHours } from "@/domain/settings/operational-hours";

describe("parseOperationalHours", () => {
  it("accepts a typical same-day hotel window", () => {
    expect(
      parseOperationalHours({
        checkInTime: "14:00:00",
        checkOutTime: "11:00",
        extraBedsMax: 4,
      }),
    ).toEqual({
      ok: true,
      data: {
        checkInTime: "14:00",
        checkOutTime: "11:00",
        extraBedsMax: 4,
      },
    });
  });

  it("rejects checkout that is not before check-in", () => {
    expect(
      parseOperationalHours({
        checkInTime: "12:00",
        checkOutTime: "12:00",
        extraBedsMax: 0,
      }).ok,
    ).toBe(false);
    expect(
      parseOperationalHours({
        checkInTime: "10:00",
        checkOutTime: "14:00",
        extraBedsMax: 0,
      }),
    ).toMatchObject({ ok: false, error: "settings.checkout_must_be_before_checkin" });
  });

  it("rejects invalid clocks and extra-bed counts", () => {
    expect(
      parseOperationalHours({
        checkInTime: "25:00",
        checkOutTime: "11:00",
        extraBedsMax: 0,
      }).ok,
    ).toBe(false);
    expect(
      parseOperationalHours({
        checkInTime: "14:00",
        checkOutTime: "11:00",
        extraBedsMax: -1,
      }),
    ).toMatchObject({ ok: false, error: "settings.invalid_extra_beds" });
    expect(
      parseOperationalHours({
        checkInTime: "14:00",
        checkOutTime: "11:00",
        extraBedsMax: 1.5,
      }).ok,
    ).toBe(false);
  });
});

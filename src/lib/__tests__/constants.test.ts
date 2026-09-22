import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHECK_IN_TIME,
  DEFAULT_CHECK_OUT_TIME,
  DEFAULT_PARTY_ADULTS,
  clockHm,
  resolvePensionStayTimes,
  resolveStayWindowTimes,
} from "@/lib/constants";

describe("DEFAULT_PARTY_ADULTS", () => {
  it("is a two-adult fallback", () => {
    expect(DEFAULT_PARTY_ADULTS).toBe(2);
  });
});

describe("clockHm", () => {
  it("trims DB seconds", () => {
    expect(clockHm("14:00:00")).toBe("14:00");
  });

  it("returns null for empty values", () => {
    expect(clockHm(null)).toBeNull();
    expect(clockHm("  ")).toBeNull();
  });
});

describe("resolvePensionStayTimes", () => {
  it("uses product defaults when settings are missing", () => {
    expect(resolvePensionStayTimes(null)).toEqual({
      checkIn: DEFAULT_CHECK_IN_TIME,
      checkOut: DEFAULT_CHECK_OUT_TIME,
    });
  });

  it("keeps tenant-saved times including 12:00 checkout", () => {
    expect(
      resolvePensionStayTimes({
        default_check_in_time: "15:00",
        default_check_out_time: "12:00",
      })
    ).toEqual({ checkIn: "15:00", checkOut: "12:00" });
  });
});

describe("resolveStayWindowTimes", () => {
  it("prefers dedicated columns over pension stay times", () => {
    expect(
      resolveStayWindowTimes({
        checkinTimeFrom: "16:00",
        checkoutTimeUntil: "10:00",
        defaultCheckInTime: "14:00",
        defaultCheckOutTime: "11:00",
      })
    ).toEqual({ checkIn: "16:00", checkOut: "10:00" });
  });

  it("falls back to pension stay times then product defaults", () => {
    expect(
      resolveStayWindowTimes({
        defaultCheckOutTime: "12:00",
      })
    ).toEqual({
      checkIn: DEFAULT_CHECK_IN_TIME,
      checkOut: "12:00",
    });
    expect(resolveStayWindowTimes({})).toEqual({
      checkIn: DEFAULT_CHECK_IN_TIME,
      checkOut: DEFAULT_CHECK_OUT_TIME,
    });
  });
});

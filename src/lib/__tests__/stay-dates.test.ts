import { describe, it, expect } from "vitest";
import {
  parseIso,
  formatIso,
  addDays,
  stayNightDates,
  stayNightCount,
  nightOccupied,
  yearBounds,
  monthBounds,
  isLeapYearGregorian,
  daysInGregorianYear,
  lastDayOfMonth,
  firstDayOfMonth,
  nightsBetween,
  clampCheckInDate,
  defaultNewStayDates,
  minCheckOutDate,
} from "@/lib/stay-dates";

// ---------------------------------------------------------------------------
// check-in date constraints
// ---------------------------------------------------------------------------
describe("clampCheckInDate", () => {
  it("keeps future dates unchanged", () => {
    expect(clampCheckInDate("2025-06-15", "2025-06-10")).toBe("2025-06-15");
  });

  it("clamps past dates to today", () => {
    expect(clampCheckInDate("2025-06-08", "2025-06-10")).toBe("2025-06-10");
  });

  it("keeps today unchanged", () => {
    expect(clampCheckInDate("2025-06-10", "2025-06-10")).toBe("2025-06-10");
  });
});

describe("defaultNewStayDates", () => {
  it("defaults to today with checkout next day", () => {
    expect(defaultNewStayDates("2025-06-10")).toEqual({
      checkIn: "2025-06-10",
      checkOut: "2025-06-11",
    });
  });
});

describe("minCheckOutDate", () => {
  it("returns day after clamped check-in", () => {
    expect(minCheckOutDate("2025-06-08", "2025-06-10")).toBe("2025-06-11");
  });
});

// ---------------------------------------------------------------------------
// parseIso + formatIso roundtrip
// ---------------------------------------------------------------------------
describe("parseIso / formatIso", () => {
  it("roundtrips an ISO date string", () => {
    expect(formatIso(parseIso("2025-06-15"))).toBe("2025-06-15");
  });

  it("roundtrips January 1st", () => {
    expect(formatIso(parseIso("2025-01-01"))).toBe("2025-01-01");
  });

  it("roundtrips December 31st", () => {
    expect(formatIso(parseIso("2025-12-31"))).toBe("2025-12-31");
  });

  it("pads single-digit months and days", () => {
    expect(formatIso(parseIso("2025-03-05"))).toBe("2025-03-05");
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------
describe("addDays", () => {
  it("adds days forward", () => {
    expect(addDays("2025-06-10", 3)).toBe("2025-06-13");
  });

  it("subtracts days (negative)", () => {
    expect(addDays("2025-06-10", -2)).toBe("2025-06-08");
  });

  it("crosses month boundary forward", () => {
    expect(addDays("2025-01-30", 3)).toBe("2025-02-02");
  });

  it("crosses year boundary forward", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("adds 0 days returns same date", () => {
    expect(addDays("2025-06-10", 0)).toBe("2025-06-10");
  });
});

// ---------------------------------------------------------------------------
// stayNightDates
// ---------------------------------------------------------------------------
describe("stayNightDates", () => {
  it("returns nights between checkIn (inclusive) and checkOut (exclusive)", () => {
    expect(stayNightDates("2025-06-10", "2025-06-12")).toEqual([
      "2025-06-10",
      "2025-06-11",
    ]);
  });

  it("returns single night for adjacent days", () => {
    expect(stayNightDates("2025-06-10", "2025-06-11")).toEqual(["2025-06-10"]);
  });

  it("returns empty for same check-in and check-out", () => {
    expect(stayNightDates("2025-06-10", "2025-06-10")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// stayNightCount
// ---------------------------------------------------------------------------
describe("stayNightCount", () => {
  it("returns 2 for a 2-night stay", () => {
    expect(stayNightCount("2025-06-10", "2025-06-12")).toBe(2);
  });

  it("returns 0 for same-day", () => {
    expect(stayNightCount("2025-06-10", "2025-06-10")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// nightOccupied
// ---------------------------------------------------------------------------
describe("nightOccupied", () => {
  it("returns true for a date inside the range", () => {
    expect(nightOccupied("2025-06-11", "2025-06-10", "2025-06-13")).toBe(true);
  });

  it("returns true for check-in date itself", () => {
    expect(nightOccupied("2025-06-10", "2025-06-10", "2025-06-13")).toBe(true);
  });

  it("returns false for the check-out date", () => {
    expect(nightOccupied("2025-06-13", "2025-06-10", "2025-06-13")).toBe(false);
  });

  it("returns false for a date before the range", () => {
    expect(nightOccupied("2025-06-09", "2025-06-10", "2025-06-13")).toBe(false);
  });

  it("returns false for a date after the range", () => {
    expect(nightOccupied("2025-06-14", "2025-06-10", "2025-06-13")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// yearBounds
// ---------------------------------------------------------------------------
describe("yearBounds", () => {
  it("returns Jan 1 to Dec 31", () => {
    expect(yearBounds(2025)).toEqual({
      start: "2025-01-01",
      end: "2025-12-31",
    });
  });
});

// ---------------------------------------------------------------------------
// monthBounds
// ---------------------------------------------------------------------------
describe("monthBounds", () => {
  it("returns correct bounds for January (month 0)", () => {
    expect(monthBounds(2025, 0)).toEqual({
      start: "2025-01-01",
      end: "2025-01-31",
    });
  });

  it("returns correct bounds for February in a non-leap year", () => {
    expect(monthBounds(2025, 1)).toEqual({
      start: "2025-02-01",
      end: "2025-02-28",
    });
  });

  it("returns correct bounds for February in a leap year", () => {
    expect(monthBounds(2024, 1)).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
  });

  it("returns correct bounds for December (month 11)", () => {
    expect(monthBounds(2025, 11)).toEqual({
      start: "2025-12-01",
      end: "2025-12-31",
    });
  });
});

// ---------------------------------------------------------------------------
// isLeapYearGregorian
// ---------------------------------------------------------------------------
describe("isLeapYearGregorian", () => {
  it("2024 is a leap year", () => {
    expect(isLeapYearGregorian(2024)).toBe(true);
  });

  it("2025 is not a leap year", () => {
    expect(isLeapYearGregorian(2025)).toBe(false);
  });

  it("2000 is a leap year (divisible by 400)", () => {
    expect(isLeapYearGregorian(2000)).toBe(true);
  });

  it("1900 is not a leap year (divisible by 100 but not 400)", () => {
    expect(isLeapYearGregorian(1900)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// daysInGregorianYear
// ---------------------------------------------------------------------------
describe("daysInGregorianYear", () => {
  it("leap year has 366 days", () => {
    expect(daysInGregorianYear(2024)).toBe(366);
  });

  it("non-leap year has 365 days", () => {
    expect(daysInGregorianYear(2025)).toBe(365);
  });
});

// ---------------------------------------------------------------------------
// lastDayOfMonth
// ---------------------------------------------------------------------------
describe("lastDayOfMonth", () => {
  it("returns last day of February (non-leap)", () => {
    expect(lastDayOfMonth("2025-02-15")).toBe("2025-02-28");
  });

  it("returns last day of February (leap)", () => {
    expect(lastDayOfMonth("2024-02-01")).toBe("2024-02-29");
  });

  it("returns last day of a 31-day month", () => {
    expect(lastDayOfMonth("2025-01-10")).toBe("2025-01-31");
  });

  it("returns last day of a 30-day month", () => {
    expect(lastDayOfMonth("2025-06-15")).toBe("2025-06-30");
  });
});

// ---------------------------------------------------------------------------
// firstDayOfMonth
// ---------------------------------------------------------------------------
describe("firstDayOfMonth", () => {
  it("returns first day of the month", () => {
    expect(firstDayOfMonth("2025-06-15")).toBe("2025-06-01");
  });

  it("returns itself if already the first", () => {
    expect(firstDayOfMonth("2025-03-01")).toBe("2025-03-01");
  });
});

// ---------------------------------------------------------------------------
// nightsBetween
// ---------------------------------------------------------------------------
describe("nightsBetween", () => {
  it("returns inclusive range of dates", () => {
    expect(nightsBetween("2025-06-10", "2025-06-12")).toEqual([
      "2025-06-10",
      "2025-06-11",
      "2025-06-12",
    ]);
  });

  it("returns single date when start equals end", () => {
    expect(nightsBetween("2025-06-10", "2025-06-10")).toEqual(["2025-06-10"]);
  });

  it("returns empty when start is after end", () => {
    expect(nightsBetween("2025-06-12", "2025-06-10")).toEqual([]);
  });
});

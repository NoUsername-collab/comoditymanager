import { describe, it, expect } from "vitest";
import {
  toIntlLocale,
  parseDateIsoLocal,
  daysInMonth,
  isLeapYear,
  formatWeekdayShort,
  formatWeekdayNarrow,
  monthYearLabel,
} from "@/lib/ro-calendar";

// ---------------------------------------------------------------------------
// toIntlLocale
// ---------------------------------------------------------------------------
describe("toIntlLocale", () => {
  it('maps "ro" to "ro-RO"', () => {
    expect(toIntlLocale("ro")).toBe("ro-RO");
  });

  it('maps "bg" to "bg-BG"', () => {
    expect(toIntlLocale("bg")).toBe("bg-BG");
  });

  it('maps "en" to "en-GB"', () => {
    expect(toIntlLocale("en")).toBe("en-GB");
  });

  it('maps unknown locale to "en-GB"', () => {
    expect(toIntlLocale("fr")).toBe("en-GB");
    expect(toIntlLocale("de")).toBe("en-GB");
    expect(toIntlLocale("")).toBe("en-GB");
  });
});

// ---------------------------------------------------------------------------
// parseDateIsoLocal
// ---------------------------------------------------------------------------
describe("parseDateIsoLocal", () => {
  it("returns correct year, month, and day", () => {
    const d = parseDateIsoLocal("2025-06-15");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(5); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it("sets time to noon (12:00)", () => {
    const d = parseDateIsoLocal("2025-01-01");
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("handles end-of-year date", () => {
    const d = parseDateIsoLocal("2024-12-31");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// daysInMonth (0-indexed month)
// ---------------------------------------------------------------------------
describe("daysInMonth", () => {
  it("January (month 0) has 31 days", () => {
    expect(daysInMonth(2025, 0)).toBe(31);
  });

  it("February 2024 (leap year) has 29 days", () => {
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it("February 2025 (non-leap) has 28 days", () => {
    expect(daysInMonth(2025, 1)).toBe(28);
  });

  it("April (month 3) has 30 days", () => {
    expect(daysInMonth(2025, 3)).toBe(30);
  });

  it("December (month 11) has 31 days", () => {
    expect(daysInMonth(2025, 11)).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// isLeapYear
// ---------------------------------------------------------------------------
describe("isLeapYear", () => {
  it("2024 is a leap year", () => {
    expect(isLeapYear(2024)).toBe(true);
  });

  it("2025 is not a leap year", () => {
    expect(isLeapYear(2025)).toBe(false);
  });

  it("2000 is a leap year (divisible by 400)", () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it("1900 is not a leap year (divisible by 100 but not 400)", () => {
    expect(isLeapYear(1900)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatWeekdayShort
// ---------------------------------------------------------------------------
describe("formatWeekdayShort", () => {
  it("returns a non-empty string", () => {
    const result = formatWeekdayShort("2025-06-02", "ro"); // Monday
    expect(result.length).toBeGreaterThan(0);
  });

  it("different locales return different results", () => {
    const ro = formatWeekdayShort("2025-06-02", "ro");
    const en = formatWeekdayShort("2025-06-02", "en");
    expect(ro).not.toBe(en);
  });

  it("strips trailing dot from formatted output", () => {
    const result = formatWeekdayShort("2025-06-02", "ro");
    expect(result.endsWith(".")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// formatWeekdayNarrow
// ---------------------------------------------------------------------------
describe("formatWeekdayNarrow", () => {
  it("returns a single character", () => {
    const result = formatWeekdayNarrow("2025-06-02", "ro");
    expect(result.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// monthYearLabel
// ---------------------------------------------------------------------------
describe("monthYearLabel", () => {
  it("returns a non-empty string containing the year", () => {
    const label = monthYearLabel(2025, 5, "ro"); // June 2025
    expect(label.length).toBeGreaterThan(0);
    expect(label).toContain("2025");
  });

  it("works for different locales", () => {
    const ro = monthYearLabel(2025, 0, "ro"); // January
    const en = monthYearLabel(2025, 0, "en");
    expect(ro).not.toBe(en);
  });
});

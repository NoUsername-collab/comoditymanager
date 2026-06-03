import { describe, it, expect, vi, afterEach } from "vitest";
import {
  shiftStayDatesByYears,
  shiftStayToNextFutureYear,
} from "@/domain/guest/rebook-dates";

// ---------------------------------------------------------------------------
// shiftStayDatesByYears
// ---------------------------------------------------------------------------
describe("shiftStayDatesByYears", () => {
  it("shifts dates forward by 1 year", () => {
    const result = shiftStayDatesByYears("2024-07-10", "2024-07-15", 1);
    expect(result).toEqual({
      check_in: "2025-07-10",
      check_out: "2025-07-15",
    });
  });

  it("shifts dates forward by 2 years", () => {
    const result = shiftStayDatesByYears("2023-03-01", "2023-03-05", 2);
    expect(result).toEqual({
      check_in: "2025-03-01",
      check_out: "2025-03-05",
    });
  });

  it("shifts dates backward by 1 year (negative)", () => {
    const result = shiftStayDatesByYears("2025-06-01", "2025-06-03", -1);
    expect(result).toEqual({
      check_in: "2024-06-01",
      check_out: "2024-06-03",
    });
  });

  it("preserves month and day across shift", () => {
    const result = shiftStayDatesByYears("2024-12-25", "2025-01-02", 1);
    expect(result).toEqual({
      check_in: "2025-12-25",
      check_out: "2026-01-02",
    });
  });
});

// ---------------------------------------------------------------------------
// shiftStayToNextFutureYear
// ---------------------------------------------------------------------------
describe("shiftStayToNextFutureYear", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns future stay unchanged", () => {
    // Use a date far in the future to be safe
    const result = shiftStayToNextFutureYear("2099-07-10", "2099-07-15");
    expect(result).toEqual({
      check_in: "2099-07-10",
      check_out: "2099-07-15",
    });
  });

  it("shifts a past stay to the future", () => {
    // Mock Date to control "today"
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 3)); // June 3, 2026

    const result = shiftStayToNextFutureYear("2023-08-10", "2023-08-15");
    // 2026 - 2023 = 3 years shift. Aug 10, 2026 is in the future relative to Jun 3, 2026
    expect(result).toEqual({
      check_in: "2026-08-10",
      check_out: "2026-08-15",
    });

    vi.useRealTimers();
  });

  it("shifts by one extra year if shifted date is still in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15)); // Aug 15, 2026

    // Stay from Jan 10-15, 2024. Shift by 2 years → Jan 10, 2026, but that's past Aug 15, 2026.
    // Wait: 2026 - 2024 = 2. Jan 10 2026 < Aug 15 2026 → still in the past → bump to 3 years
    const result = shiftStayToNextFutureYear("2024-01-10", "2024-01-15");
    expect(result).toEqual({
      check_in: "2027-01-10",
      check_out: "2027-01-15",
    });

    vi.useRealTimers();
  });
});

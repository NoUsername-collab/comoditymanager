import { describe, it, expect } from "vitest";
import { parseViewDate, viewDateLabel } from "@/lib/availability-date";

// ---------------------------------------------------------------------------
// parseViewDate
// ---------------------------------------------------------------------------
describe("parseViewDate", () => {
  it("returns the ISO date when it is valid", () => {
    expect(parseViewDate("2025-06-15", "2025-06-01")).toBe("2025-06-15");
  });

  it("returns today fallback when input is undefined", () => {
    expect(parseViewDate(undefined, "2025-06-01")).toBe("2025-06-01");
  });

  it("returns today fallback when input is empty string", () => {
    expect(parseViewDate("", "2025-06-01")).toBe("2025-06-01");
  });

  it("returns today fallback when input is malformed", () => {
    expect(parseViewDate("not-a-date", "2025-06-01")).toBe("2025-06-01");
  });

  it("returns today fallback when input has wrong format", () => {
    expect(parseViewDate("06-15-2025", "2025-06-01")).toBe("2025-06-01");
  });
});

// ---------------------------------------------------------------------------
// viewDateLabel
// ---------------------------------------------------------------------------
describe("viewDateLabel", () => {
  it('returns "Azi" when iso matches today', () => {
    expect(viewDateLabel("2025-06-01", "2025-06-01")).toBe("Azi");
  });

  it("returns a formatted date string when iso differs from today", () => {
    const result = viewDateLabel("2025-06-15", "2025-06-01");
    expect(result).not.toBe("Azi");
    expect(result.length).toBeGreaterThan(0);
  });
});

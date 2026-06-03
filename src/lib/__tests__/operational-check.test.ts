import { describe, it, expect } from "vitest";
import {
  parseOperationalTimestamp,
  isoToDatetimeLocal,
  formatOperationalTimestamp,
} from "@/lib/operational-check";

// ---------------------------------------------------------------------------
// parseOperationalTimestamp
// ---------------------------------------------------------------------------
describe("parseOperationalTimestamp", () => {
  it("returns current ISO timestamp when input is undefined", () => {
    const result = parseOperationalTimestamp(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns current ISO timestamp when input is null", () => {
    const result = parseOperationalTimestamp(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns current ISO timestamp when input is empty string", () => {
    const result = parseOperationalTimestamp("  ");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("parses a valid ISO string", () => {
    const result = parseOperationalTimestamp("2025-06-01T10:30:00Z");
    expect(result).toBe("2025-06-01T10:30:00.000Z");
  });

  it("throws on invalid date input", () => {
    expect(() => parseOperationalTimestamp("not-a-date")).toThrow(
      "operational.invalid_date_or_time"
    );
  });
});

// ---------------------------------------------------------------------------
// isoToDatetimeLocal
// ---------------------------------------------------------------------------
describe("isoToDatetimeLocal", () => {
  it("converts valid ISO to datetime-local format", () => {
    const result = isoToDatetimeLocal("2025-06-15T14:30:00Z");
    // Format: YYYY-MM-DDTHH:MM (local time, so exact value depends on TZ)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("returns current datetime-local for invalid input", () => {
    const result = isoToDatetimeLocal("garbage");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// formatOperationalTimestamp
// ---------------------------------------------------------------------------
describe("formatOperationalTimestamp", () => {
  it('returns dash for null input', () => {
    expect(formatOperationalTimestamp(null)).toBe("—");
  });

  it('returns dash for undefined input', () => {
    expect(formatOperationalTimestamp(undefined)).toBe("—");
  });

  it('returns dash for invalid ISO string', () => {
    expect(formatOperationalTimestamp("not-valid")).toBe("—");
  });

  it("returns a formatted string for valid ISO", () => {
    const result = formatOperationalTimestamp("2025-06-01T10:30:00Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  GUEST_RETENTION_CHOICES,
  GUEST_RETENTION_DEFAULT_MONTHS,
  guestExportFileName,
  isGuestRetentionMonths,
} from "@/domain/guest/privacy";

describe("keeping guests' identity documents", () => {
  it("accepts whole months from 6 to 120, as the database does", () => {
    expect(isGuestRetentionMonths(6)).toBe(true);
    expect(isGuestRetentionMonths(120)).toBe(true);
    expect(isGuestRetentionMonths(5)).toBe(false);
    expect(isGuestRetentionMonths(121)).toBe(false);
    expect(isGuestRetentionMonths(12.5)).toBe(false);
    for (const months of GUEST_RETENTION_CHOICES) expect(isGuestRetentionMonths(months)).toBe(true);
    expect(GUEST_RETENTION_CHOICES).toContain(GUEST_RETENTION_DEFAULT_MONTHS);
  });

  it("names a guest's export by a short id and the day, never by the guest's name", () => {
    expect(guestExportFileName("3f2a9c1e-0000-4000-8000-000000000000", "2026-11-14")).toBe(
      "oaspete-3f2a9c1e-2026-11-14.json",
    );
  });
});

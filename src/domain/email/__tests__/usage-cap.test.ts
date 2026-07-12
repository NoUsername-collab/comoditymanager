import { describe, it, expect } from "vitest";
import {
  currentUtcMonthPeriod,
  isUnderMonthlyEmailCap,
  monthlyCapExceeded,
  remainingMonthlyEmailSends,
} from "@/domain/email/usage-cap";

describe("email usage cap", () => {
  it("formats current UTC month period", () => {
    expect(currentUtcMonthPeriod()).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("allows sends under cap", () => {
    expect(isUnderMonthlyEmailCap(299, 300)).toBe(true);
    expect(monthlyCapExceeded(300, 300)).toBe(true);
  });

  it("treats null cap as unlimited", () => {
    expect(isUnderMonthlyEmailCap(999_999, null)).toBe(true);
    expect(remainingMonthlyEmailSends(10, null)).toBeNull();
  });

  it("computes remaining sends", () => {
    expect(remainingMonthlyEmailSends(250, 300)).toBe(50);
    expect(remainingMonthlyEmailSends(400, 300)).toBe(0);
  });
});

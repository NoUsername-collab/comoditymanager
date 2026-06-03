import { describe, it, expect, vi, afterEach } from "vitest";
import { isAlphaGateCookieFresh } from "@/lib/auth/alpha-gate-cookie";
import { isAdminLocationUnlockCookieFresh } from "@/lib/auth/admin-location-unlock-cookie";

// Both functions have identical logic, so we test them in parallel.

describe.each([
  { name: "isAlphaGateCookieFresh", fn: isAlphaGateCookieFresh },
  { name: "isAdminLocationUnlockCookieFresh", fn: isAdminLocationUnlockCookieFresh },
])("$name", ({ fn }) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for a future timestamp", () => {
    const futureMs = Date.now() + 60_000; // 1 minute from now
    expect(fn(`${futureMs}.hmac-signature`)).toBe(true);
  });

  it("returns false for a past timestamp", () => {
    const pastMs = Date.now() - 60_000; // 1 minute ago
    expect(fn(`${pastMs}.hmac-signature`)).toBe(false);
  });

  it("returns false for null", () => {
    expect(fn(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(fn(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(fn("")).toBe(false);
  });

  it("returns false for invalid format (non-numeric payload)", () => {
    expect(fn("not-a-number.hmac")).toBe(false);
  });

  it("correctly parses only the first part before the dot", () => {
    const futureMs = Date.now() + 120_000;
    // Token with HMAC suffix after the dot
    const token = `${futureMs}.abc123def456`;
    expect(fn(token)).toBe(true);
  });

  it("works with token that has no dot (just a timestamp)", () => {
    const futureMs = Date.now() + 60_000;
    expect(fn(`${futureMs}`)).toBe(true);
  });

  it("returns false for token with empty first segment", () => {
    expect(fn(".hmac-only")).toBe(false);
  });
});

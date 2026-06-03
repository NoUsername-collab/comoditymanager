import { describe, it, expect } from "vitest";
import { sanitizeAlphaGateReturnPath } from "@/lib/auth/alpha-gate";

describe("sanitizeAlphaGateReturnPath", () => {
  it('returns the path when it starts with "/"', () => {
    expect(sanitizeAlphaGateReturnPath("/admin/bookings")).toBe("/admin/bookings");
  });

  it('returns "/" for null', () => {
    expect(sanitizeAlphaGateReturnPath(null)).toBe("/");
  });

  it('returns "/" for undefined', () => {
    expect(sanitizeAlphaGateReturnPath(undefined)).toBe("/");
  });

  it('returns "/" for empty string', () => {
    expect(sanitizeAlphaGateReturnPath("")).toBe("/");
  });

  it('returns "/" for protocol-relative paths (//evil.com)', () => {
    expect(sanitizeAlphaGateReturnPath("//evil.com")).toBe("/");
  });

  it('returns "/" for paths with protocol injection', () => {
    expect(sanitizeAlphaGateReturnPath("https://evil.com")).toBe("/");
  });

  it('returns "/" for paths containing "://"', () => {
    expect(sanitizeAlphaGateReturnPath("/foo://bar")).toBe("/");
  });

  it('returns "/" for relative paths (no leading /)', () => {
    expect(sanitizeAlphaGateReturnPath("admin/bookings")).toBe("/");
  });
});

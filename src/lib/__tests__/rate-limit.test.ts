import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to isolate the module-level store between tests
let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("@/lib/rate-limit");
  checkRateLimit = mod.checkRateLimit;
});

describe("checkRateLimit", () => {
  it("allows the first request and returns remaining = limit - 1", () => {
    const result = checkRateLimit("ip-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(4);
    }
  });

  it("allows requests under the limit", () => {
    checkRateLimit("ip-2", 3, 60_000);
    checkRateLimit("ip-2", 3, 60_000);
    const result = checkRateLimit("ip-2", 3, 60_000);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.remaining).toBe(0);
    }
  });

  it("blocks requests at the limit", () => {
    checkRateLimit("ip-3", 2, 60_000);
    checkRateLimit("ip-3", 2, 60_000);
    const result = checkRateLimit("ip-3", 2, 60_000);
    expect(result.allowed).toBe(false);
  });

  it("uses independent counters for different keys", () => {
    checkRateLimit("key-a", 1, 60_000);
    const result = checkRateLimit("key-b", 1, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("returns retryAfterMs when blocked", () => {
    checkRateLimit("ip-4", 1, 60_000);
    const result = checkRateLimit("ip-4", 1, 60_000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThanOrEqual(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });
});

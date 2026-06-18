import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createHmac } from "node:crypto";
import { isAdminLocationUnlockTokenValidEdge } from "@/lib/auth/admin-location-unlock-edge";

function encodeToken(untilMs: number, secret: string): string {
  const payload = String(untilMs);
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

describe("isAdminLocationUnlockTokenValidEdge", () => {
  const secret = "test-secret-at-least-32-characters-long";

  beforeEach(() => {
    vi.stubEnv("ADMIN_LOCATION_UNLOCK_SECRET", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts a valid HMAC token with future expiry", async () => {
    const until = Date.now() + 60_000;
    const token = encodeToken(until, secret);
    await expect(isAdminLocationUnlockTokenValidEdge(token)).resolves.toBe(true);
  });

  it("rejects expired token even with valid HMAC", async () => {
    const until = Date.now() - 60_000;
    const token = encodeToken(until, secret);
    await expect(isAdminLocationUnlockTokenValidEdge(token)).resolves.toBe(false);
  });

  it("rejects token with invalid HMAC", async () => {
    const until = Date.now() + 60_000;
    const token = `${until}.deadbeef`;
    await expect(isAdminLocationUnlockTokenValidEdge(token)).resolves.toBe(false);
  });

  it("rejects null/empty token", async () => {
    await expect(isAdminLocationUnlockTokenValidEdge(null)).resolves.toBe(false);
    await expect(isAdminLocationUnlockTokenValidEdge("")).resolves.toBe(false);
  });
});

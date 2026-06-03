import { describe, it, expect } from "vitest";
import { isDevTenantBypass } from "@/lib/tenant/guards";

describe("isDevTenantBypass", () => {
  it("returns false when NODE_ENV is 'test'", () => {
    // vitest runs with NODE_ENV=test by default
    expect(isDevTenantBypass()).toBe(false);
  });

  it("returns a boolean", () => {
    expect(typeof isDevTenantBypass()).toBe("boolean");
  });
});

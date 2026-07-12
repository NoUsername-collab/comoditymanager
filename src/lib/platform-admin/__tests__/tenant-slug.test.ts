import { describe, expect, it } from "vitest";
import { isValidTenantSlug, slugifyTenantName } from "../tenant-slug";

describe("tenant-slug", () => {
  it("validates slugs like signup", () => {
    expect(isValidTenantSlug("casa-emil")).toBe(true);
    expect(isValidTenantSlug("abc")).toBe(true);
    expect(isValidTenantSlug("-bad")).toBe(false);
    expect(isValidTenantSlug("bad-")).toBe(false);
  });

  it("slugifies display names", () => {
    expect(slugifyTenantName("Casa Emil")).toBe("casa-emil");
    expect(slugifyTenantName("  Pensiunea Mărioara  ")).toBe("pensiunea-marioara");
  });
});
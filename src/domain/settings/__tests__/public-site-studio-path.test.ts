import { describe, expect, it } from "vitest";
import { isPublicSiteStudioPath } from "@/domain/settings/public-site-studio-path";

describe("isPublicSiteStudioPath", () => {
  it("matches the studio route with or without a query string", () => {
    expect(isPublicSiteStudioPath("/admin/settings/public-site")).toBe(true);
    expect(isPublicSiteStudioPath("/admin/settings/public-site?saved=1")).toBe(true);
  });

  it("does not match other settings pages", () => {
    expect(isPublicSiteStudioPath("/admin/settings")).toBe(false);
    expect(isPublicSiteStudioPath("/admin/settings/email")).toBe(false);
    expect(isPublicSiteStudioPath(null)).toBe(false);
  });
});

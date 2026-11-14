import { describe, expect, it } from "vitest";
import { isPageSlugShape } from "@/domain/public-site/page-slug";

describe("a page's address", () => {
  it("is one lowercase word or words joined by dashes, not an address the app uses", () => {
    expect(isPageSlugShape("restaurant")).toBe(true);
    expect(isPageSlugShape("despre-noi")).toBe(true);
    expect(isPageSlugShape("Restaurant")).toBe(false);
    expect(isPageSlugShape("a--b")).toBe(false);
    expect(isPageSlugShape("admin")).toBe(false);
    expect(isPageSlugShape("en")).toBe(false);
    expect(isPageSlugShape("x".repeat(61))).toBe(false);
  });
});

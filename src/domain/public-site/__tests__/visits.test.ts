import { describe, expect, it } from "vitest";
import { isLikelyBot, referrerHost, visitPath } from "@/domain/public-site/visits";

describe("site visits", () => {
  it("keeps only the path of a page", () => {
    expect(visitPath("/en/calendar?from=2026-12-01#top")).toBe("/en/calendar");
    expect(visitPath("https://evil.example/")).toBeNull();
    expect(visitPath("//evil.example")).toBeNull();
    expect(visitPath(42)).toBeNull();
  });

  it("names the site a visitor came from, never the full address", () => {
    expect(referrerHost("https://www.google.com/search?q=casa+ana", "casa-ana.zalmox.app")).toBe("google.com");
    expect(referrerHost("https://m.facebook.com/somebody/posts/1", "casa-ana.zalmox.app")).toBe("m.facebook.com");
    expect(referrerHost("https://casa-ana.zalmox.app/en", "casa-ana.zalmox.app")).toBeNull();
    expect(referrerHost("https://www.casa-ana.ro/", "casa-ana.ro")).toBeNull();
    expect(referrerHost("", "casa-ana.ro")).toBeNull();
    expect(referrerHost("android-app://com.google", "casa-ana.ro")).toBeNull();
  });

  it("does not count robots and link previews", () => {
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("facebookexternalhit/1.1")).toBe(true);
    expect(isLikelyBot("")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1")).toBe(false);
  });
});

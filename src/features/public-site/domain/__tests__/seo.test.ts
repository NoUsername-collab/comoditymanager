import { describe, expect, it } from "vitest";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import { publicSiteRobots, publicSiteSitemap } from "@/features/public-site/domain/seo";
import {
  seedPublicChromeCopy,
  seedPublicHomeCopy,
  seedPublicPages,
} from "@/features/public-site/domain/seed-copy";

const BASE = "https://casa.zalmox.app";

function site(published: boolean) {
  return {
    ...buildDefaultPublicSiteConfig({
      displayName: "Casa",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      copy: seedPublicHomeCopy(),
      chrome: seedPublicChromeCopy(),
      pages: seedPublicPages(),
    }),
    published,
  };
}

describe("public site robots", () => {
  it("keeps an unpublished site out of search", () => {
    expect(publicSiteRobots(site(false), BASE)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(publicSiteSitemap(site(false), BASE)).toEqual([]);
  });

  it("points crawlers at the sitemap and away from staff pages", () => {
    const robots = publicSiteRobots(site(true), BASE);
    expect(robots.sitemap).toBe(`${BASE}/sitemap.xml`);
    expect(robots.rules.disallow).toContain("/admin");
  });
});

describe("public site sitemap", () => {
  it("lists each page in every language, Romanian without a prefix", () => {
    const urls = publicSiteSitemap(site(true), BASE).map((entry) => entry.url);
    expect(urls).toEqual([
      `${BASE}/`,
      `${BASE}/en`,
      `${BASE}/bg`,
      `${BASE}/calendar`,
      `${BASE}/en/calendar`,
      `${BASE}/bg/calendar`,
      `${BASE}/confidentialitate`,
      `${BASE}/en/confidentialitate`,
      `${BASE}/bg/confidentialitate`,
      `${BASE}/termeni`,
      `${BASE}/en/termeni`,
      `${BASE}/bg/termeni`,
    ]);
  });

  it("leaves out the booking page when booking is off", () => {
    const urls = publicSiteSitemap({ ...site(true), bookingEnabled: false }, BASE).map((e) => e.url);
    expect(urls.some((url) => url.includes("/calendar"))).toBe(false);
  });
});

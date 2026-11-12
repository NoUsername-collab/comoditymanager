import { describe, expect, it } from "vitest";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import {
  publicPageAlternates,
  publicSiteRobots,
  publicSiteSitemap,
  titleWithName,
} from "@/features/public-site/domain/seo";
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

describe("page titles", () => {
  it("carry the property's name once", () => {
    expect(titleWithName("Hospira Managia", "Test Hotel")).toBe("Hospira Managia · Test Hotel");
    expect(titleWithName("Camere la Casa Ana", "casa ana")).toBe("Camere la Casa Ana");
    expect(titleWithName("", "Casa Ana")).toBe("Casa Ana");
    expect(titleWithName("Confidențialitate", "")).toBe("Confidențialitate");
  });
});

describe("a page's address and its languages", () => {
  it("points each language at itself and lists the others, Romanian for anyone else", () => {
    expect(publicPageAlternates(BASE, "/calendar", "en")).toEqual({
      canonical: `${BASE}/en/calendar`,
      languages: {
        ro: `${BASE}/calendar`,
        en: `${BASE}/en/calendar`,
        bg: `${BASE}/bg/calendar`,
        "x-default": `${BASE}/calendar`,
      },
    });
    expect(publicPageAlternates(BASE, "/", "ro").canonical).toBe(`${BASE}/`);
    expect(publicPageAlternates(BASE, "/", "bg").canonical).toBe(`${BASE}/bg`);
  });
});

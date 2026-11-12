import { describe, expect, it } from "vitest";
import {
  defaultPublicChrome,
  normalizePublicChrome,
  publicChromeFontStack,
} from "@/features/public-site/domain/chrome";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

describe("normalizePublicChrome", () => {
  it("defaults the contact bar on and the menu to home and privacy", () => {
    const chrome = normalizePublicChrome({});
    expect(chrome.showContactBar).toBe(true);
    expect(chrome.menu?.map((item) => item.kind)).toEqual(["home", "privacy"]);
    expect(chrome.fontId).toBe("theme");
  });

  it("keeps a tenant logo url", () => {
    expect(normalizePublicChrome({ logoUrl: "https://cdn.example/logo.png" }).logoUrl).toBe(
      "https://cdn.example/logo.png",
    );
  });
});

describe("publicChromeFontStack", () => {
  it("only overrides serif and sans", () => {
    expect(publicChromeFontStack("theme")).toBeNull();
    expect(publicChromeFontStack("serif")).toMatch(/Georgia/);
    expect(publicChromeFontStack("sans")).toMatch(/sans-serif/);
  });
});

describe("resolvePublicNavItems", () => {
  const chrome = {
    ...defaultPublicChrome(),
    navHome: { en: "Home" },
    navPrivacy: { en: "Privacy" },
    navTerms: { en: "Terms" },
    navBook: { en: "Book" },
  };
  const site = (extra: Partial<PublicSiteConfig>) =>
    ({ chrome, bookingEnabled: true, bookingNavPosition: "nav", sections: [], sitePages: [], ...extra }) as PublicSiteConfig;

  it("lists the menu, then the booking button", () => {
    expect(resolvePublicNavItems(site({}), "en").map((item) => item.key)).toEqual(["home", "privacy", "book"]);
  });

  it("omits an item whose label is empty in this locale", () => {
    const items = resolvePublicNavItems(site({ chrome: { ...chrome, navHome: { ro: "Stored" } } }), "en");
    expect(items.map((item) => item.key)).toEqual(["privacy", "book"]);
  });

  it("hides booking when the site is unpublished", () => {
    const items = resolvePublicNavItems(site({ published: false }), "en");
    expect(items.map((item) => item.key)).not.toContain("book");
  });
});

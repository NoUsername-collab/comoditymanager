import { describe, expect, it } from "vitest";
import {
  defaultPublicChrome,
  normalizePublicChrome,
  publicChromeFontStack,
} from "@/features/public-site/domain/chrome";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

describe("normalizePublicChrome", () => {
  it("defaults contact bar on and terms nav off", () => {
    const chrome = normalizePublicChrome({});
    expect(chrome.showContactBar).toBe(true);
    expect(chrome.showNavTerms).toBe(false);
    expect(chrome.fontId).toBe("theme");
    expect(chrome.showStayOffers).toBe(true);
    expect(chrome.showPlace).toBe(true);
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
  const fallback = { home: "Home", privacy: "Privacy", terms: "Terms", book: "Book" };

  it("hides terms until enabled", () => {
    const items = resolvePublicNavItems(
      {
        chrome: defaultPublicChrome(),
        bookingEnabled: true,
        bookingNavPosition: "nav",
      } as PublicSiteConfig,
      "en",
      fallback,
    );
    expect(items.map((item) => item.key)).toEqual(["home", "privacy", "book"]);
  });

  it("hides booking when the site is unpublished", () => {
    const items = resolvePublicNavItems(
      {
        chrome: defaultPublicChrome(),
        published: false,
        bookingEnabled: true,
        bookingNavPosition: "nav",
      } as PublicSiteConfig,
      "en",
      fallback,
    );
    expect(items.map((item) => item.key)).not.toContain("book");
  });
});

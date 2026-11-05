import { describe, expect, it } from "vitest";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import {
  seedPublicChromeCopy,
  seedPublicHomeCopy,
  seedPublicPages,
} from "@/features/public-site/domain/seed-copy";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import { fillLegalPlaceholders } from "@/features/public-site/ui/PublicLegalCopy";

function newSite() {
  return buildDefaultPublicSiteConfig({
    displayName: "Casa Test",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    copy: seedPublicHomeCopy(),
    chrome: seedPublicChromeCopy(),
    pages: seedPublicPages(),
  });
}

describe("seeded site copy", () => {
  it("gives a new site a header menu with the booking button once published", () => {
    const site = { ...newSite(), published: true };
    for (const locale of PUBLIC_LOCALES) {
      const keys = resolvePublicNavItems(site, locale).map((item) => item.key);
      expect(keys).toEqual(["home", "privacy", "book"]);
    }
  });

  it("writes the privacy policy in each language, not one copied into all", () => {
    const body = seedPublicPages().privacyBody;
    expect(new Set(PUBLIC_LOCALES.map((locale) => body[locale])).size).toBe(3);
    for (const locale of PUBLIC_LOCALES) expect(body[locale]).toContain("{email}");
  });

  it("starts unpublished, with a coming-soon page that says why", () => {
    const site = newSite();
    expect(site.published).toBe(false);
    for (const locale of PUBLIC_LOCALES) {
      expect(site.pages.comingSoonTitle?.[locale]).toBeTruthy();
      expect(site.pages.comingSoonLead?.[locale]).toBeTruthy();
    }
  });

  it("leaves the terms body empty so the cancellation policy shows", () => {
    expect(seedPublicPages()).not.toHaveProperty("termsBody");
  });
});

describe("contact links", () => {
  it("carry the address and number a visitor would copy", () => {
    const links = buildPublicContactLinks({ email: "a@b.ro", whatsapp: "0730 127 427", telegram: "@casa" });
    expect(links.map((link) => [link.id, link.detail])).toEqual([
      ["email", "a@b.ro"],
      ["whatsapp", "0730 127 427"],
      ["telegram", "@casa"],
    ]);
  });
});

describe("legal placeholders", () => {
  it("fills the contact email, or the name when there is none", () => {
    expect(fillLegalPlaceholders("{name} — {email}", { name: "Casa", email: "a@b.ro" })).toBe(
      "Casa — a@b.ro",
    );
    expect(fillLegalPlaceholders("Scrie la {email}.", { name: "Casa", email: null })).toBe(
      "Scrie la Casa.",
    );
  });
});

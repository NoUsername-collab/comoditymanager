import { describe, expect, it } from "vitest";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import {
  seedPublicChromeCopy,
  seedPublicHomeCopy,
  seedPublicLegalPages,
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
    pages: seedPublicLegalPages(),
  });
}

describe("seeded site copy", () => {
  it("gives a new site a header menu with the booking button", () => {
    for (const locale of PUBLIC_LOCALES) {
      const keys = resolvePublicNavItems(newSite(), locale).map((item) => item.key);
      expect(keys).toEqual(["home", "privacy", "book"]);
    }
  });

  it("writes the privacy policy in each language, not one copied into all", () => {
    const body = seedPublicLegalPages().privacyBody;
    expect(new Set(PUBLIC_LOCALES.map((locale) => body[locale])).size).toBe(3);
    for (const locale of PUBLIC_LOCALES) expect(body[locale]).toContain("{email}");
  });

  it("leaves the terms body empty so the cancellation policy shows", () => {
    expect(seedPublicLegalPages()).not.toHaveProperty("termsBody");
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

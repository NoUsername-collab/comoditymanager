import { describe, expect, it } from "vitest";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  applyQuickStart,
  editKeyForSection,
  fillStudioLocaleFrom,
  isFreshPublicSite,
  quickStartAnswersFrom,
  firstErrorTab,
  linkPresetFor,
  publicSiteReadiness,
  studioLocaleProgress,
  tabForFieldPath,
} from "@/features/public-site/editor/model/editor-model";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
  patchStudioCopy,
} from "@/features/public-site/editor/model/studio-draft";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { EMPTY_PENSION_CONTACT } from "@/domain/settings/pension-identity";

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 3,
  templateId: "classic",
  themeId: "noir",
  published: false,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: {
    title: { ro: "Casa", en: "House" },
    subtitle: { ro: "Liniște la munte" },
    imageUrl: null,
  },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: { enabled: true, title: {}, items: [], footer: {} },
  chrome: {},
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "intro-1",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: { title: { ro: "Despre" }, lead: { ro: "Text RO" } },
    },
    {
      id: "steps-1",
      sectionType: "steps",
      sortOrder: 20,
      visible: false,
      payload: { title: {}, items: [] },
    },
  ],
  displayName: "Casa Test",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
};

describe("public site editor model", () => {
  it("routes server field errors to the tab that owns them", () => {
    expect(tabForFieldPath("contact.email")).toBe("contact");
    expect(tabForFieldPath("pages.ogImageUrl")).toBe("publish");
    expect(tabForFieldPath("hero.title")).toBe("content");
    expect(firstErrorTab({})).toBeNull();
    expect(firstErrorTab({ "seo.metaTitle": "x" })).toBe("publish");
  });

  it("maps known hrefs to presets and everything else to custom", () => {
    expect(linkPresetFor("/calendar")).toBe("calendar");
    expect(linkPresetFor(" #public-intro ")).toBe("intro");
    expect(linkPresetFor("https://example.com")).toBe("custom");
  });

  it("always places the gallery in the section order", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    expect(draft.sectionOrder).toContain("gallery");
  });

  it("measures copy per language and ignores hidden sections", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const progress = studioLocaleProgress(draft);
    expect(progress.ro).toBeGreaterThan(progress.en);
    expect(progress.bg).toBe(0);

    const withSteps = { ...draft, stepsVisible: true };
    expect(studioLocaleProgress(withSteps).ro).toBeLessThan(progress.ro);
  });

  it("fills only empty fields when copying from another language", () => {
    const draft = buildPublicSiteStudioDraft(config, "en");
    const filled = fillStudioLocaleFrom(draft, "ro", "en");
    expect(filled.copies.en.heroTitle).toBe("House");
    expect(filled.copies.en.heroSubtitle).toBe("Liniște la munte");
    expect(filled.copies.en.introLead).toBe("Text RO");
    expect(filled.copies.ro).toBe(draft.copies.ro);
  });

  it("keeps copied text counted as untranslated until it is changed", () => {
    let draft = buildPublicSiteStudioDraft(config, "en");
    const before = studioLocaleProgress(draft).en;
    draft = fillStudioLocaleFrom(draft, "ro", "en");
    expect(studioLocaleProgress(draft).en).toBe(before);

    draft = patchStudioCopy(draft, { heroSubtitle: "Quiet in the mountains" });
    expect(studioLocaleProgress(draft).en).toBeGreaterThan(before);
  });

  it("still counts copied text as untranslated after a save and reload", () => {
    let draft = buildPublicSiteStudioDraft(config, "en");
    const before = studioLocaleProgress(draft).en;
    draft = fillStudioLocaleFrom(draft, "ro", "en");
    const input = mergeStudioToInput({ config, draft });
    expect(input.untranslatedCopy.en).toContain("Text RO");

    const reloaded = buildPublicSiteStudioDraft(
      buildPublicSiteConfigFromInput(config, input, EMPTY_PENSION_CONTACT),
      "en",
    );
    expect(studioLocaleProgress(reloaded).en).toBe(before);
  });

  it("forgets a copied text once it is translated", () => {
    let draft = fillStudioLocaleFrom(buildPublicSiteStudioDraft(config, "en"), "ro", "en");
    draft = patchStudioCopy(draft, { introLead: "Text EN" });
    expect(mergeStudioToInput({ config, draft }).untranslatedCopy.en ?? []).not.toContain("Text RO");
  });

  it("copies homepage text only, never legal pages or SEO", () => {
    let draft = buildPublicSiteStudioDraft(config, "ro");
    draft = patchStudioCopy(draft, { termsBody: "Termeni RO", seoTitle: "SEO RO" });
    draft = fillStudioLocaleFrom(draft, "ro", "en");
    expect(draft.copies.en.termsBody).toBe("");
    expect(draft.copies.en.seoTitle).toBe("");
    expect(fillStudioLocaleFrom(draft, "ro", "en")).toBe(draft);
  });

  it("lists what is missing before publishing", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const items = publicSiteReadiness(draft, { contact: { email: null, phone: null }, stayOffers: [] });
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));
    expect(byId.heroImage).toMatchObject({ done: false, tab: "content" });
    expect(byId.heroTitle?.done).toBe(true);
    expect(byId.contact).toMatchObject({ done: false, tab: "contact" });

    const ready = publicSiteReadiness(patchStudioCopy({ ...draft, heroImageUrl: "x.jpg" }, {}), {
      contact: { email: "a@b.ro", phone: null },
      stayOffers: [],
    });
    expect(ready.find((item) => item.id === "heroImage")?.done).toBe(true);
    expect(ready.find((item) => item.id === "contact")?.done).toBe(true);
  });

  it("flags what loses bookings: a missing top button, a link to a hidden section, no rooms", () => {
    const draft = {
      ...buildPublicSiteStudioDraft(config, "ro"),
      bookingEnabled: true,
      heroCtaSecondaryHref: "#public-intro",
      introVisible: false,
    };
    const items = publicSiteReadiness(
      patchStudioCopy(draft, { heroCtaPrimary: "Rezervă" }),
      { contact: { email: "a@b.ro", phone: null }, stayOffers: [] },
    );
    const byId = Object.fromEntries(items.map((item) => [item.id, item.done]));
    expect(byId.heroButton).toBe(false);
    expect(byId.heroLinks).toBe(false);
    expect(byId.rooms).toBe(false);

    const fixed = publicSiteReadiness(
      { ...draft, introVisible: true, bookingEnabled: false },
      { contact: { email: "a@b.ro", phone: null }, stayOffers: [] },
    );
    const fixedById = Object.fromEntries(fixed.map((item) => [item.id, item.done]));
    expect(fixedById.heroButton).toBe(true);
    expect(fixedById.heroLinks).toBe(true);
    expect(fixedById.rooms).toBe(true);
  });

  it("stops counting a default text once another language says something of its own", () => {
    const stock = { ro: ["Liniște"], en: ["Quiet"], bg: ["Тишина"] };
    let draft = buildPublicSiteStudioDraft(config, "ro");
    for (const [locale, text] of Object.entries(stock)) {
      draft = patchStudioCopy({ ...draft, editLocale: locale as "ro" | "en" | "bg" }, { heroSubtitle: text[0] });
    }
    const before = studioLocaleProgress(draft, stock).en;
    draft = patchStudioCopy({ ...draft, editLocale: "ro" }, { heroSubtitle: "Cabană lângă lac" });
    expect(studioLocaleProgress(draft, stock).en).toBeLessThan(before);
  });

  it("maps a rendered section back to its editor card", () => {
    const order = ["intro", "text:a", "gallery", "text:b"];
    expect(editKeyForSection("intro", 0, order)).toBe("intro");
    expect(editKeyForSection("text", 1, order)).toBe("text:b");
    expect(editKeyForSection("text", 2, order)).toBeNull();
    expect(editKeyForSection("cta", 0, order)).toBeNull();
  });

  it("applies quick start answers to the current language only", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    expect(isFreshPublicSite(draft)).toBe(true);
    let seq = 0;
    const next = applyQuickStart(
      draft,
      {
        ...quickStartAnswersFrom(draft),
        heroSubtitle: "Nou",
        heroImageUrl: "hero.jpg",
        galleryUrls: ["a.jpg", "", "a.jpg"],
        styleId: "seaside",
      },
      () => `g${++seq}`,
    );
    expect(next.copies.ro.heroSubtitle).toBe("Nou");
    expect(next.copies.en.heroSubtitle).toBe(draft.copies.en.heroSubtitle);
    expect(next.galleryItems).toEqual([{ id: "g1", url: "a.jpg" }]);
    expect(next.galleryVisible).toBe(true);
    expect(next.templateId).toBe("immersive");
    expect(next.themeId).toBe("mediterranean");
    expect(next.sectionOrder[0]).toBe("gallery");
    // Contact belongs to Property identity; the quick start leaves the site's own fields alone.
    expect(next.contactPhone).toBe(draft.contactPhone);
    expect(isFreshPublicSite(next)).toBe(false);
  });
});

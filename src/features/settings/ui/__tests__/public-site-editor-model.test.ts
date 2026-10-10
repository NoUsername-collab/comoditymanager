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
} from "@/features/settings/ui/public-site-editor-model";
import {
  buildPublicSiteStudioDraft,
  patchStudioCopy,
} from "@/features/settings/ui/public-site-studio-draft";

const config: PublicSiteConfig = {
  id: "ps-1",
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

  it("lists what is missing before publishing", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const items = publicSiteReadiness(draft, { contact: { email: null, phone: null } });
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));
    expect(byId.heroImage).toMatchObject({ done: false, tab: "content" });
    expect(byId.heroTitle?.done).toBe(true);
    expect(byId.contact).toMatchObject({ done: false, tab: "contact" });

    const ready = publicSiteReadiness(patchStudioCopy({ ...draft, heroImageUrl: "x.jpg" }, {}), {
      contact: { email: "a@b.ro", phone: null },
    });
    expect(ready.find((item) => item.id === "heroImage")?.done).toBe(true);
    expect(ready.find((item) => item.id === "contact")?.done).toBe(true);
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
        contactPhone: "+40 700 000 000",
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
    expect(next.contactPhone).toBe("+40 700 000 000");
    expect(isFreshPublicSite(next)).toBe(false);
  });
});

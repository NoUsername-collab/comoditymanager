import { describe, expect, it } from "vitest";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  applyQuickStart,
  editKeyFromPreviewTarget,
  fillStudioLocaleFrom,
  isFreshPublicSite,
  previewFocusFor,
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
  patchStudioSection,
  type PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";
import {
  findSectionDraft,
  sectionField,
  setSectionField,
} from "@/features/public-site/editor/model/section-draft";

/** Show or hide the first section of a type. */
function showSection(draft: PublicSiteStudioDraft, type: "steps" | "intro", visible: boolean) {
  const key = findSectionDraft(draft.sections, type)!.key;
  return patchStudioSection(draft, key, (section) => ({ ...section, visible }));
}

const introLead = (draft: PublicSiteStudioDraft, locale: "ro" | "en" | "bg") =>
  sectionField(findSectionDraft(draft.sections, "intro"), locale, "lead");
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
    expect(tabForFieldPath("contact.email")).toBe("settings");
    expect(tabForFieldPath("pages.ogImageUrl")).toBe("settings");
    expect(tabForFieldPath("hero.title")).toBe("content");
    expect(firstErrorTab({})).toBeNull();
    expect(firstErrorTab({ "seo.metaTitle": "x" })).toBe("settings");
  });

  it("maps known hrefs to presets and everything else to custom", () => {
    expect(linkPresetFor("/calendar")).toBe("calendar");
    expect(linkPresetFor(" #public-intro ")).toBe("intro");
    expect(linkPresetFor("https://example.com")).toBe("custom");
  });

  it("always has a gallery to place", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    expect(findSectionDraft(draft.sections, "gallery")).toBeDefined();
  });

  it("measures copy per language and ignores hidden sections", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const progress = studioLocaleProgress(draft);
    expect(progress.ro).toBeGreaterThan(progress.en);
    expect(progress.bg).toBe(0);

    const withSteps = showSection(draft, "steps", true);
    expect(studioLocaleProgress(withSteps).ro).toBeLessThan(progress.ro);
  });

  it("fills only empty fields when copying from another language", () => {
    const draft = buildPublicSiteStudioDraft(config, "en");
    const filled = fillStudioLocaleFrom(draft, "ro", "en");
    expect(filled.copies.en.heroTitle).toBe("House");
    expect(filled.copies.en.heroSubtitle).toBe("Liniște la munte");
    expect(introLead(filled, "en")).toBe("Text RO");
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
    const intro = findSectionDraft(draft.sections, "intro")!.key;
    draft = patchStudioSection(draft, intro, (section) => setSectionField(section, "en", "lead", "Text EN"));
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
    expect(byId.contact).toMatchObject({ done: false, tab: "settings" });

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
    };
    const hiddenIntro = showSection(draft, "intro", false);
    const items = publicSiteReadiness(
      patchStudioCopy(hiddenIntro, { heroCtaPrimary: "Rezervă" }),
      { contact: { email: "a@b.ro", phone: null }, stayOffers: [] },
    );
    const byId = Object.fromEntries(items.map((item) => [item.id, item.done]));
    expect(byId.heroButton).toBe(false);
    expect(byId.heroLinks).toBe(false);
    expect(byId.rooms).toBe(false);

    const fixed = publicSiteReadiness(
      { ...showSection(draft, "intro", true), bookingEnabled: false },
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

  it("asks for a privacy policy before publishing", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const contact = { contact: { email: "a@b.ro", phone: null }, stayOffers: [] };
    const privacy = (d: PublicSiteStudioDraft) =>
      publicSiteReadiness(d, contact).find((item) => item.id === "privacy");
    expect(privacy(draft)).toMatchObject({ done: false, tab: "settings" });
    expect(privacy(patchStudioCopy(draft, { privacyBody: "Datele voastre…" }))?.done).toBe(true);
  });

  it("checks the gallery only when it is shown", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const contact = { contact: { email: "a@b.ro", phone: null }, stayOffers: [] };
    const ids = (d: PublicSiteStudioDraft) => publicSiteReadiness(d, contact).map((item) => item.id);
    expect(ids(draft)).not.toContain("gallery");
    const gallery = findSectionDraft(draft.sections, "gallery")!.key;
    const shown = patchStudioSection(draft, gallery, (section) => ({ ...section, visible: true }));
    expect(publicSiteReadiness(shown, contact).find((item) => item.id === "gallery")?.done).toBe(false);
  });

  it("points the preview at the opened part, and marks a hidden one", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    expect(previewFocusFor("hero", draft)).toEqual({ selector: ".pub-hero", hidden: false });
    // "steps-1" is hidden in the fixture; it is the first steps section.
    expect(previewFocusFor("steps-1", draft)).toEqual({
      selector: '[data-pub-section="steps"][data-pub-nth="0"]',
      sectionIndex: draft.sections.findIndex((section) => section.key === "steps-1"),
      hidden: true,
    });
    expect(previewFocusFor(null, draft)).toBeNull();
  });

  it("sends each unfinished check to the part that fixes it", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const items = publicSiteReadiness(draft, { contact: { email: null, phone: null }, stayOffers: [] });
    const part = (id: string) => items.find((item) => item.id === id)?.part;
    expect(part("heroImage")).toBe("hero");
    expect(part("contact")).toBe("contact");
    expect(part("privacy")).toBe("legal");
  });

  it("maps a rendered section back to its editor card", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const rendered = (type: string, nth: number) => {
      const element = { closest: (selector: string) =>
        selector === "[data-pub-section]" ? { dataset: { pubSection: type, pubNth: String(nth) } } : null,
      } as unknown as Element;
      return editKeyFromPreviewTarget(element, draft);
    };
    expect(rendered("intro", 0)).toBe("intro-1");
    expect(rendered("text", 0)).toBeNull();
    expect(rendered("cta", 0)).toBeNull();
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
    const gallery = findSectionDraft(next.sections, "gallery")!;
    expect(gallery.items).toEqual([{ id: "g1", structure: { url: "a.jpg" } }]);
    expect(gallery.visible).toBe(true);
    expect(next.templateId).toBe("immersive");
    expect(next.themeId).toBe("mediterranean");
    expect(next.sections[0]?.type).toBe("gallery");
    // Contact belongs to Property identity; the quick start leaves the site's own fields alone.
    expect(next.contactPhone).toBe(draft.contactPhone);
    expect(isFreshPublicSite(next)).toBe(false);
  });
});

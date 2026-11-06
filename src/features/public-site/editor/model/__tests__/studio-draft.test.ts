import { describe, expect, it } from "vitest";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { textSectionIdFromKey } from "@/features/public-site/domain/order-sections";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  addStudioTextSection,
  buildPublicSiteStudioDraft,
  mergeStudioDrafts,
  mergeStudioToInput,
  moveStudioSection,
  patchStudioCopy,
  removeStudioBenefit,
  switchStudioLocale,
} from "@/features/public-site/editor/model/studio-draft";

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 3,
  templateId: "classic",
  themeId: "noir",
  published: true,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: {
    title: { ro: "RO hero", en: "EN hero", bg: "BG hero" },
    imageUrl: "https://cdn.example/hero.jpg",
  },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: {
    enabled: true,
    title: { en: "Good to know" },
    items: [],
    footer: {},
  },
  chrome: {},
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "intro-1",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: { title: { ro: "RO intro", en: "EN intro" } },
    },
  ],
  displayName: "Casa Test",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
};

describe("public site studio draft", () => {
  it("saves one language without wiping the others", () => {
    let draft = buildPublicSiteStudioDraft(config, "en");
    draft = patchStudioCopy(draft, { heroTitle: "EN home" });
    draft = switchStudioLocale(draft, "ro");
    draft = patchStudioCopy(draft, { heroTitle: "RO casa" });

    const input = mergeStudioToInput({ config, draft });
    expect(input.hero.title).toEqual({
      ro: "RO casa",
      en: "EN home",
      bg: "BG hero",
    });
    expect(input.hero.showCheckTimes).toBe(true);
    expect(input.chrome.showContactBar).toBe(true);
    expect(input.chrome.showStayOffers).toBe(true);
    expect(input.chrome.showPlace).toBe(true);
    expect(input.sections.find((section) => section.sectionType === "intro")?.payload.title).toEqual({
      ro: "RO intro",
      en: "EN intro",
    });
  });

  it("keeps each language's text with its row when a row is removed", () => {
    const withBenefits: PublicSiteConfig = {
      ...config,
      sections: [
        ...config.sections,
        {
          id: "benefits-1",
          sectionType: "benefits",
          sortOrder: 20,
          visible: true,
          payload: {
            title: {},
            items: [
              { icon: "wifi", title: { ro: "Wi-Fi", en: "Wi-Fi" }, text: {} },
              { icon: "parking", title: { ro: "Parcare", en: "Parking" }, text: {} },
              { icon: "breakfast", title: { ro: "Mic dejun", en: "Breakfast" }, text: {} },
            ],
          },
        },
      ],
    };
    let draft = buildPublicSiteStudioDraft(withBenefits, "ro");
    draft = removeStudioBenefit(draft, 1);

    expect(draft.copies.en.benefitItems.map((item) => item.title)).toEqual([
      "Wi-Fi",
      "Breakfast",
    ]);
    const input = mergeStudioToInput({ config: withBenefits, draft });
    const items = input.sections.find((section) => section.sectionType === "benefits")?.payload
      .items as { title: Record<string, string> }[];
    expect(items.map((item) => item.title)).toEqual([
      { ro: "Wi-Fi", en: "Wi-Fi" },
      { ro: "Mic dejun", en: "Breakfast" },
    ]);
  });

  it("sends saved section ids back, and new text sections with their own id", () => {
    const savedId = "3f2b8c1e-5d4a-4b6f-9a7e-2c1d0e9f8a7b";
    const saved: PublicSiteConfig = {
      ...config,
      sections: [{ ...config.sections[0]!, id: savedId }],
    };
    const draft = addStudioTextSection(buildPublicSiteStudioDraft(saved, "ro"));
    const input = mergeStudioToInput({ config: saved, draft });

    expect(input.sections.find((section) => section.sectionType === "intro")?.id).toBe(savedId);
    const text = input.sections.find((section) => section.sectionType === "text");
    expect(text?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(text?.id).toBe(textSectionIdFromKey(draft.sectionOrder.at(-1) ?? ""));
    // Built-in defaults have no database id yet; they are created on save.
    expect(input.sections.find((section) => section.sectionType === "gallery")?.id).toBeUndefined();
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);
  });

  it("keeps the closing booking band last when sections move", () => {
    const draft = { ...buildPublicSiteStudioDraft(config, "ro"), sectionOrder: ["intro", "cta", "gallery"] };
    expect(moveStudioSection(draft, "gallery", -1).sectionOrder).toEqual(["gallery", "intro", "cta"]);
    expect(moveStudioSection(draft, "gallery", 1)).toBe(draft);
  });

  it("round-trips extra jsonb keys through parse", () => {
    const messy = {
      ...config,
      hero: { ...config.hero, overlay: "legacy" },
    } as PublicSiteConfig;
    const draft = patchStudioCopy(buildPublicSiteStudioDraft(messy, "en"), {
      heroTitle: "EN home",
    });
    const input = mergeStudioToInput({ config: messy, draft });
    const parsed = parsePublicSiteSettingsInput(input);
    expect(parsed.ok).toBe(true);
  });
});

describe("merging after a version conflict", () => {
  it("keeps the operator's edits and takes the colleague's everywhere else", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const mine = patchStudioCopy({ ...base, showCheckTimes: !base.showCheckTimes }, {
      heroSubtitle: "Al meu",
    });
    const theirs = patchStudioCopy({ ...base, themeId: "forest" }, { introLead: "Al colegului" });

    const merged = mergeStudioDrafts(base, mine, theirs);
    expect(merged.copies.ro.heroSubtitle).toBe("Al meu");
    expect(merged.copies.ro.introLead).toBe("Al colegului");
    expect(merged.showCheckTimes).toBe(mine.showCheckTimes);
    expect(merged.themeId).toBe("forest");
  });
});

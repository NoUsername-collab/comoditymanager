import { describe, expect, it } from "vitest";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
  patchStudioCopy,
  switchStudioLocale,
} from "@/features/settings/ui/public-site-studio-draft";

const config: PublicSiteConfig = {
  id: "ps-1",
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

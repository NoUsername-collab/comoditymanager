import { describe, expect, it } from "vitest";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import type { PublicSectionType, PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  addSectionDraft,
  findSectionDraft,
  moveSectionDraft,
  moveSectionDraftTo,
  addSectionItem,
  setItemField,
  orderSectionsForTemplate,
  removeSectionItem,
  sectionField,
  setSectionField,
} from "@/features/public-site/editor/model/section-draft";
import {
  buildPublicSiteStudioDraft,
  mergeStudioDrafts,
  mergeStudioToInput,
  patchStudioCopy,
  patchStudioSection,
  switchStudioLocale,
  type PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";
import { SECTION_KINDS } from "@/features/public-site/sections/kinds";

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
  media: [],
};

const ALL_TYPES = Object.keys(SECTION_KINDS) as PublicSectionType[];
/** Kinds with a title of their own (rooms and map take theirs from the site). */
const TITLED_TYPES = ALL_TYPES.filter((type) => SECTION_KINDS[type].copyFields.includes("title"));

/** Edit the first section of a type in the language being edited. */
function editSection(
  draft: PublicSiteStudioDraft,
  type: PublicSectionType,
  field: string,
  value: string,
): PublicSiteStudioDraft {
  const section = findSectionDraft(draft.sections, type)!;
  return patchStudioSection(draft, section.key, (current) =>
    setSectionField(current, draft.editLocale, field, value),
  );
}

describe("public site studio draft", () => {
  it("saves one language without wiping the others", () => {
    let draft = buildPublicSiteStudioDraft(config, "en");
    draft = patchStudioCopy(draft, { heroTitle: "EN home" });
    draft = switchStudioLocale(draft, "ro");
    draft = patchStudioCopy(draft, { heroTitle: "RO casa" });

    const input = mergeStudioToInput({ config, draft });
    expect(input.hero.title).toEqual({ ro: "RO casa", en: "EN home", bg: "BG hero" });
    expect(input.hero.showCheckTimes).toBe(true);
    expect(input.chrome.showContactBar).toBe(true);
    // Rooms and map are sections: a site saved before them gets both, shown.
    expect(
      input.sections.filter((s) => s.sectionType === "stays" || s.sectionType === "place"),
    ).toMatchObject([
      { sectionType: "stays", visible: true, payload: { showPrices: true } },
      { sectionType: "place", visible: true },
    ]);
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
    const benefits = findSectionDraft(draft.sections, "benefits")!;
    draft = patchStudioSection(draft, benefits.key, (current) =>
      removeSectionItem(current, current.items[1]!.id),
    );

    const input = mergeStudioToInput({ config: withBenefits, draft });
    const items = input.sections.find((section) => section.sectionType === "benefits")?.payload
      .items as { title: Record<string, string> }[];
    expect(items.map((item) => item.title)).toEqual([
      { ro: "Wi-Fi", en: "Wi-Fi" },
      { ro: "Mic dejun", en: "Breakfast" },
    ]);
  });

  it("sends saved section ids back, and new sections with the id made for them", () => {
    const savedId = "3f2b8c1e-5d4a-4b6f-9a7e-2c1d0e9f8a7b";
    const newId = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
    const saved: PublicSiteConfig = {
      ...config,
      sections: [{ ...config.sections[0]!, id: savedId }],
    };
    const base = buildPublicSiteStudioDraft(saved, "ro");
    const draft = { ...base, sections: addSectionDraft(base.sections, "text", newId)! };
    const input = mergeStudioToInput({ config: saved, draft });

    expect(input.sections.find((section) => section.sectionType === "intro")?.id).toBe(savedId);
    expect(input.sections.find((section) => section.sectionType === "text")?.id).toBe(newId);
    // A section that was never saved has no database id yet; it is created on save.
    expect(input.sections.find((section) => section.sectionType === "gallery")?.id).toBeUndefined();
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);
  });

  it("keeps the closing booking band last when sections move", () => {
    const withCta: PublicSiteConfig = {
      ...config,
      sections: [
        ...config.sections,
        { id: "cta-1", sectionType: "cta", sortOrder: 20, visible: true, payload: {} },
      ],
    };
    const sections = buildPublicSiteStudioDraft(withCta, "ro").sections;
    expect(sections.map((section) => section.type)).toEqual([
      "intro",
      "gallery",
      "stays",
      "place",
      "cta",
    ]);
    const place = findSectionDraft(sections, "place")!;
    // Rooms and map move like any other section; the closing band stays last.
    expect(moveSectionDraft(sections, place.key, -1).map((section) => section.type)).toEqual([
      "intro",
      "gallery",
      "place",
      "stays",
      "cta",
    ]);
    expect(moveSectionDraft(sections, place.key, 1)).toBe(sections);
  });

  it("drops a dragged section on another one's place, closing band still last", () => {
    const withCta: PublicSiteConfig = {
      ...config,
      sections: [...config.sections, { id: "cta-1", sectionType: "cta", sortOrder: 20, visible: true, payload: {} }],
    };
    const sections = buildPublicSiteStudioDraft(withCta, "ro").sections;
    const place = findSectionDraft(sections, "place")!;
    const intro = findSectionDraft(sections, "intro")!;
    expect(moveSectionDraftTo(sections, place.key, intro.key).map((s) => s.type)).toEqual([
      "place", "intro", "gallery", "stays", "cta",
    ]);
    expect(moveSectionDraftTo(sections, place.key, "cta-1")).toBe(sections);
  });

  it("follows a layout's rhythm", () => {
    const sections = buildPublicSiteStudioDraft(config, "ro").sections;
    expect(orderSectionsForTemplate(sections, "immersive").map((section) => section.type)).toEqual([
      "gallery",
      "intro",
      "stays",
      "place",
    ]);
  });

  it("saves and reads back every kind's own text", () => {
    const allKinds: PublicSiteConfig = {
      ...config,
      sections: ALL_TYPES.map(
        (sectionType, index) =>
          ({
            id: `s-${sectionType}`,
            sectionType,
            sortOrder: index * 10,
            visible: true,
            payload: {},
          }) as PublicSiteConfig["sections"][number],
      ),
    };
    let draft = buildPublicSiteStudioDraft(allKinds, "ro");
    for (const type of TITLED_TYPES) draft = editSection(draft, type, "title", `RO ${type}`);

    const saved = mergeStudioToInput({ config: allKinds, draft }).sections.map((section, index) => ({
      ...section,
      id: `saved-${index}`,
    })) as PublicSiteConfig["sections"];
    const reloaded = buildPublicSiteStudioDraft({ ...allKinds, sections: saved }, "ro");
    for (const type of TITLED_TYPES) {
      expect(sectionField(findSectionDraft(reloaded.sections, type), "ro", "title")).toBe(`RO ${type}`);
    }
  });

  it("keeps a text section's photo and what it shows, and drops the photo once removed", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const intro = findSectionDraft(base.sections, "intro")!;
    let withPhoto: typeof intro = {
      ...intro,
      settings: { ...intro.settings, imageUrl: "https://x.supabase.co/casa.jpg" },
    };
    withPhoto = setSectionField(withPhoto, "ro", "imageAlt", "Casa văzută din grădină");
    const draft = patchStudioSection(base, intro.key, () => withPhoto);
    const input = mergeStudioToInput({ config, draft });
    const saved = input.sections.find((s) => s.sectionType === "intro")!;
    expect(saved.payload.imageUrl).toBe("https://x.supabase.co/casa.jpg");
    expect(saved.payload.imageAlt).toEqual({ ro: "Casa văzută din grădină" });
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);

    const removed = patchStudioSection(draft, intro.key, (s) => ({ ...s, settings: { ...s.settings, imageUrl: "" } }));
    const after = mergeStudioToInput({ config, draft: removed }).sections.find((s) => s.sectionType === "intro")!;
    expect(after.payload.imageUrl).toBeUndefined();
  });

  it("keeps each room type's words by the room type; photos come from the library", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const stays = findSectionDraft(base.sections, "stays")!;
    let rooms = addSectionItem(stays, {}, "type-double");
    rooms = addSectionItem(rooms, {}, "type-triple");
    rooms = setItemField(rooms, "ro", "type-double", "text", "Pat dublu, balcon spre munte.");
    const draft = patchStudioSection(base, stays.key, () => rooms);
    const input = mergeStudioToInput({ config, draft });
    const saved = input.sections.find((s) => s.sectionType === "stays");
    // The triple row has no words, so it is not kept.
    expect(saved?.payload.items).toEqual([
      { roomTypeId: "type-double", text: { ro: "Pat dublu, balcon spre munte." } },
    ]);
    expect(saved?.payload.showPrices).toBe(true);
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);

    const reloaded = buildPublicSiteStudioDraft(
      { ...config, sections: [{ id: "s", sectionType: "stays", sortOrder: 1, visible: true, payload: saved!.payload }] },
      "ro",
    );
    expect(findSectionDraft(reloaded.sections, "stays")!.items[0]?.id).toBe("type-double");
  });

  it("keeps which albums a gallery shows, how and how many first", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const gallery = findSectionDraft(base.sections, "gallery")!;
    const draft = patchStudioSection(base, gallery.key, (section) => ({
      ...section,
      visible: true,
      settings: { ...section.settings, albums: "food,exterior,nope", layout: "carousel", limit: "12" },
    }));
    const input = mergeStudioToInput({ config, draft });
    const saved = input.sections.find((s) => s.sectionType === "gallery")!;
    expect(saved.payload).toMatchObject({ albums: ["exterior", "food"], layout: "carousel", limit: 12 });
    expect(saved.visible).toBe(true);
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);

    const reloaded = buildPublicSiteStudioDraft(
      { ...config, sections: [{ id: "g", sectionType: "gallery", sortOrder: 1, visible: true, payload: saved.payload }] },
      "ro",
    );
    expect(findSectionDraft(reloaded.sections, "gallery")!.settings).toMatchObject({
      albums: "exterior,food",
      layout: "carousel",
      limit: "12",
    });
  });

  it("adds each new kind once, saves it and lets it be removed", () => {
    let draft = buildPublicSiteStudioDraft(config, "ro");
    for (const type of ["reviews", "faq", "amenities", "attractions", "video"] as const) {
      const sections = addSectionDraft(draft.sections, type, `00000000-0000-4000-8000-00000000000${type.length}`);
      expect(sections).not.toBeNull();
      draft = { ...draft, sections: sections! };
      // One of each on a page.
      expect(addSectionDraft(draft.sections, type, "again")).toBeNull();
    }
    const faq = findSectionDraft(draft.sections, "faq")!;
    draft = patchStudioSection(draft, faq.key, (section) =>
      setItemField(setItemField(section, "ro", section.items[0]!.id, "question", "Animale?"), "ro", section.items[0]!.id, "answer", "Da, **mici**."),
    );
    const input = mergeStudioToInput({ config, draft });
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);
    const saved = input.sections.find((section) => section.sectionType === "faq");
    expect(saved?.payload.items).toEqual([{ question: { ro: "Animale?" }, answer: { ro: "Da, **mici**." } }]);
    // Built-in kinds such as the closing band are not added by the operator.
    expect(addSectionDraft(draft.sections, "cta", "x")).toBeNull();
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
    expect(parsePublicSiteSettingsInput(input).ok).toBe(true);
  });
});

describe("merging after a version conflict", () => {
  it("keeps the operator's edits and takes the colleague's everywhere else", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const mine = patchStudioCopy({ ...base, showCheckTimes: !base.showCheckTimes }, {
      heroSubtitle: "Al meu",
    });
    const theirs = editSection({ ...base, themeId: "forest" }, "intro", "lead", "Al colegului");

    const merged = mergeStudioDrafts(base, mine, theirs);
    expect(merged.copies.ro.heroSubtitle).toBe("Al meu");
    expect(sectionField(findSectionDraft(merged.sections, "intro"), "ro", "lead")).toBe(
      "Al colegului",
    );
    expect(merged.showCheckTimes).toBe(mine.showCheckTimes);
    expect(merged.themeId).toBe("forest");
  });

  it("keeps a section the operator added and one the colleague added", () => {
    const base = buildPublicSiteStudioDraft(config, "ro");
    const mine = { ...base, sections: addSectionDraft(base.sections, "text", "mine")! };
    const theirs = { ...base, sections: addSectionDraft(base.sections, "text", "theirs")! };
    const keys = mergeStudioDrafts(base, mine, theirs).sections.map((section) => section.key);
    expect(keys).toContain("mine");
    expect(keys).toContain("theirs");
  });
});

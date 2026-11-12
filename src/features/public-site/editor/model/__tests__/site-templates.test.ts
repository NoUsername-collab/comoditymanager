import { describe, expect, it } from "vitest";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { styleFromSettings } from "@/features/public-site/domain/section-style";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { setSectionField, findSectionDraft, sectionField } from "@/features/public-site/editor/model/section-draft";
import { buildPublicSiteStudioDraft, mergeStudioToInput, patchStudioSection } from "@/features/public-site/editor/model/studio-draft";
import {
  applySiteTemplate,
  matchingSiteTemplate,
  SITE_TEMPLATES,
  siteTemplate,
} from "@/features/public-site/editor/model/site-templates";

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 3,
  templateId: "classic",
  themeId: "noir",
  published: true,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: { title: { ro: "Casa" }, subtitle: {}, imageUrl: null },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: { enabled: true, title: {}, items: [], footer: {} },
  chrome: { menu: [{ id: "home", kind: "home", label: {} }] },
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: { title: { ro: "Despre noi" }, lead: { ro: "Textul meu" }, style: { background: "accent" } },
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      sectionType: "text",
      sortOrder: 20,
      visible: true,
      payload: { title: { ro: "Istoria casei" }, body: { ro: "Din 1920" } },
    },
  ],
  sitePages: [],
  displayName: "Casa Test",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
  media: [],
};

let seq = 0;
const newKey = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

describe("site templates", () => {
  it("each have a known look and name only kinds that exist", () => {
    expect(new Set(SITE_TEMPLATES.map((template) => template.id)).size).toBe(SITE_TEMPLATES.length);
  });

  it("restyle and reorder the first page, keeping every text", () => {
    const draft = buildPublicSiteStudioDraft(config, "ro");
    const applied = applySiteTemplate(draft, siteTemplate("mountain")!, newKey);

    expect(applied).toMatchObject({ templateId: "classic", themeId: "alpine", fontId: "lora" });
    expect(matchingSiteTemplate(applied)).toBe("mountain");
    const types = applied.sections.map((section) => section.type);
    // The template's order first; the free text it does not name keeps going, after them.
    // "benefits" is not on this site and cannot be added to the first page: skipped.
    expect(types.slice(0, 3)).toEqual(["intro", "gallery", "stays"]);
    expect(types).toContain("text");
    expect(types.indexOf("text")).toBeGreaterThan(types.indexOf("place"));

    const intro = findSectionDraft(applied.sections, "intro")!;
    expect(sectionField(intro, "ro", "lead")).toBe("Textul meu");
    // The operator's own style gives way to the template's (here: as the page).
    expect(styleFromSettings(intro.settings).background).toBe("auto");
    const reviews = findSectionDraft(applied.sections, "reviews")!;
    expect(reviews.visible).toBe(true);
    expect(styleFromSettings(reviews.settings)).toMatchObject({ background: "accent", align: "center" });
    expect(findSectionDraft(applied.sections, "gallery")!.settings.layout).toBe("mosaic");
    const text = findSectionDraft(applied.sections, "text")!;
    expect(sectionField(text, "ro", "body")).toBe("Din 1920");
  });

  it("add their pages, named in every language and in the menu, once", () => {
    const draft = buildPublicSiteStudioDraft(config, "en");
    const once = applySiteTemplate(draft, siteTemplate("farm")!, newKey);
    expect(once.pages.map((page) => page.slug)).toEqual(["restaurant", "despre-noi"]);
    expect(once.pages[1]!.copy).toMatchObject({
      ro: { title: "Despre noi" },
      en: { title: "About us" },
      bg: { title: "За нас" },
    });
    expect(once.menu.filter((item) => item.kind === "page")).toHaveLength(2);

    const twice = applySiteTemplate(once, siteTemplate("farm")!, newKey);
    expect(twice.pages).toHaveLength(2);
    expect(twice.menu).toHaveLength(once.menu.length);
  });

  it("leave a site that saves and passes the schema", () => {
    for (const template of SITE_TEMPLATES) {
      let draft = buildPublicSiteStudioDraft(config, "ro");
      draft = patchStudioSection(draft, draft.sections[0]!.key, (section) =>
        setSectionField(section, "ro", "title", "Bine ați venit"),
      );
      const applied = applySiteTemplate(draft, template, newKey);
      const parsed = parsePublicSiteSettingsInput(mergeStudioToInput({ config, draft: applied }));
      expect(parsed.ok, template.id).toBe(true);
    }
  });
});

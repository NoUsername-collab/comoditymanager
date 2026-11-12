import {
  styleSettingKey,
  SECTION_STYLE_KEYS,
  type SectionStyle,
} from "@/features/public-site/domain/section-style";
import { slugifyPageName } from "@/features/public-site/domain/site-pages";
import {
  PUBLIC_LOCALES,
  type PublicFontId,
  type PublicLocale,
  type PublicSectionType,
  type PublicTemplateId,
  type PublicThemeId,
} from "@/features/public-site/domain/types";
import { addMenuItem } from "@/features/public-site/editor/model/menu-draft";
import {
  keepPinnedLast,
  newSectionDraft,
  sectionKindLimit,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import {
  createSitePageDraft,
  type PageModelId,
} from "@/features/public-site/editor/model/site-page-draft";
import type { PublicSiteStudioDraft } from "@/features/public-site/editor/model/studio-draft";

/*
 * Whole-site templates: a layout, a palette and a font, the first page's
 * sections in an order with a look each, and the own pages such a place
 * usually has. Applying one never removes or rewrites what the operator wrote:
 * it restyles and reorders, shows the sections it names, and adds what is missing.
 */

type TemplateSection = {
  type: PublicSectionType;
  /** Only what differs from the page; the rest goes back to "as the page". */
  style?: Partial<SectionStyle>;
  /** Kind settings a template sets (a gallery's layout), never the operator's choices of content. */
  settings?: Record<string, string>;
};

export type SiteTemplate = {
  id: string;
  templateId: PublicTemplateId;
  themeId: PublicThemeId;
  fontId: PublicFontId;
  /** The first page, top to bottom (the closing band stays last on its own). */
  home: TemplateSection[];
  /** Own pages it adds when the site has none at that address yet. */
  pages: PageModelId[];
};

export const SITE_TEMPLATES = [
  {
    id: "mountain",
    templateId: "classic",
    themeId: "alpine",
    fontId: "lora",
    home: [
      { type: "intro" },
      { type: "benefits", style: { background: "soft" } },
      { type: "gallery", style: { width: "wide" }, settings: { layout: "mosaic" } },
      { type: "stays" },
      { type: "amenities" },
      { type: "reviews", style: { background: "accent", align: "center" } },
      { type: "faq", style: { width: "narrow" } },
      { type: "place" },
    ],
    pages: ["activities"],
  },
  {
    id: "seaside",
    templateId: "immersive",
    themeId: "mediterranean",
    fontId: "theme",
    home: [
      { type: "intro", style: { align: "center" } },
      { type: "gallery", settings: { layout: "carousel" } },
      { type: "stays" },
      { type: "attractions", style: { look: "editorial" } },
      { type: "reviews", style: { background: "contrast", align: "center" } },
      { type: "faq", style: { width: "narrow" } },
      { type: "place" },
    ],
    pages: ["location"],
  },
  {
    id: "farm",
    templateId: "classic",
    themeId: "forest",
    fontId: "nunito",
    home: [
      { type: "intro" },
      { type: "text", style: { look: "editorial" } },
      { type: "gallery", settings: { layout: "grid" } },
      { type: "amenities", style: { background: "soft" } },
      { type: "stays" },
      { type: "reviews", style: { align: "center" } },
      { type: "place" },
    ],
    pages: ["restaurant", "about"],
  },
  {
    id: "boutique",
    templateId: "editorial",
    themeId: "pearl",
    fontId: "playfair",
    home: [
      { type: "intro", style: { width: "narrow", align: "center" } },
      { type: "gallery", settings: { layout: "feature" } },
      { type: "stays" },
      { type: "amenities", style: { background: "soft" } },
      { type: "attractions" },
      { type: "reviews", style: { background: "contrast" } },
      { type: "place" },
    ],
    pages: ["about"],
  },
  {
    id: "cabin",
    templateId: "immersive",
    themeId: "noir",
    fontId: "montserrat",
    home: [
      { type: "intro" },
      { type: "gallery", style: { width: "full" }, settings: { layout: "mosaic" } },
      { type: "stays" },
      { type: "benefits", style: { background: "contrast" } },
      { type: "steps" },
      { type: "faq" },
      { type: "place" },
    ],
    pages: ["activities"],
  },
  {
    id: "city",
    templateId: "classic",
    themeId: "slate",
    fontId: "sans",
    home: [
      { type: "intro", style: { width: "narrow" } },
      { type: "stays" },
      { type: "steps", style: { background: "soft" } },
      { type: "amenities" },
      { type: "faq", style: { width: "narrow" } },
      { type: "place" },
    ],
    pages: ["location"],
  },
] as const satisfies readonly SiteTemplate[];

export type SiteTemplateId = (typeof SITE_TEMPLATES)[number]["id"];

export function siteTemplate(id: string): SiteTemplate | undefined {
  return SITE_TEMPLATES.find((template) => template.id === id);
}

/** A page a template adds is named in every language, so it reads right whichever one is shown. */
export const PAGE_MODEL_NAMES: Record<PageModelId, Record<PublicLocale, string>> = {
  blank: { ro: "Pagină nouă", en: "New page", bg: "Нова страница" },
  restaurant: { ro: "Restaurant", en: "Restaurant", bg: "Ресторант" },
  activities: { ro: "Activități", en: "Activities", bg: "Занимания" },
  about: { ro: "Despre noi", en: "About us", bg: "За нас" },
  location: { ro: "Cum ajungi", en: "Getting here", bg: "Как да стигнете" },
};

function withStyle(section: SectionDraft, entry: TemplateSection): SectionDraft {
  const settings = { ...section.settings, ...(entry.settings ?? {}) };
  for (const key of SECTION_STYLE_KEYS) settings[styleSettingKey(key)] = entry.style?.[key] ?? "auto";
  return { ...section, visible: true, settings };
}

/**
 * The draft with a template applied. Every text, photo and row stays; sections
 * the template does not name keep their place after the ones it does.
 */
export function applySiteTemplate(
  draft: PublicSiteStudioDraft,
  template: SiteTemplate,
  newKey: () => string,
): PublicSiteStudioDraft {
  const used = new Set<string>();
  const ordered: SectionDraft[] = [];
  for (const entry of template.home) {
    const existing = draft.sections.find((section) => section.type === entry.type && !used.has(section.key));
    if (existing) {
      used.add(existing.key);
      ordered.push(withStyle(existing, entry));
    } else if (sectionKindLimit(entry.type, false) > 0) {
      ordered.push(withStyle(newSectionDraft(entry.type, newKey()), entry));
    }
  }
  const sections = keepPinnedLast([...ordered, ...draft.sections.filter((section) => !used.has(section.key))]);

  // Own pages the site does not have yet, named in every language and linked from the menu.
  let pages = draft.pages;
  let menu = draft.menu;
  for (const model of template.pages) {
    const names = PAGE_MODEL_NAMES[model];
    const slug = slugifyPageName(names.ro);
    if (pages.some((page) => page.slug === slug)) continue;
    const page = createSitePageDraft({
      name: names[draft.editLocale],
      model,
      locale: draft.editLocale,
      takenSlugs: pages.map((row) => row.slug),
      newKey,
    });
    for (const locale of PUBLIC_LOCALES) page.copy[locale] = { ...page.copy[locale], title: names[locale] };
    page.slug = slug;
    pages = [...pages, page];
    menu = addMenuItem(menu, { id: newKey(), kind: "page", ref: page.key, label: {} });
  }

  return {
    ...draft,
    templateId: template.templateId,
    themeId: template.themeId,
    fontId: template.fontId,
    sections,
    pages,
    menu,
  };
}

/** The template the draft matches by look (layout, palette, font), if any. */
export function matchingSiteTemplate(
  draft: Pick<PublicSiteStudioDraft, "templateId" | "themeId" | "fontId">,
): SiteTemplateId | null {
  return (
    SITE_TEMPLATES.find(
      (template) =>
        template.templateId === draft.templateId &&
        template.themeId === draft.themeId &&
        template.fontId === draft.fontId,
    )?.id ?? null
  );
}

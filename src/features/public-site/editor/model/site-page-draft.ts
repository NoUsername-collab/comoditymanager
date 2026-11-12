import { pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import { freePageSlug } from "@/features/public-site/domain/site-pages";
import {
  PUBLIC_LOCALES,
  type PublicLocale,
  type PublicSectionType,
  type PublicSiteConfig,
  type PublicSitePageInput,
} from "@/features/public-site/domain/types";
import {
  keepPinnedLast,
  newSectionDraft,
  readSectionList,
  writeSectionList,
  type SectionDraft,
  type SectionTextSlot,
} from "@/features/public-site/editor/model/section-draft";

/** A page's own texts, per language: its title, the line under it, and what Google shows. */
export const PAGE_TEXT_FIELDS = ["title", "lead", "seoDescription"] as const;
export type PageTextField = (typeof PAGE_TEXT_FIELDS)[number];
export type PageCopy = Record<PageTextField, string>;

/** One of the site's own pages in the editor, with its sections. */
export type SitePageDraft = {
  /** The page's id: saved, or made in the browser for a page added now. */
  key: string;
  slug: string;
  imageUrl: string;
  visible: boolean;
  copy: Record<PublicLocale, PageCopy>;
  sections: SectionDraft[];
};

/** Ready-made pages to start from: the sections each one opens with. */
export const PAGE_MODELS = {
  blank: [{ type: "text" }],
  restaurant: [{ type: "text" }, { type: "gallery", settings: { albums: "food" } }, { type: "faq" }],
  activities: [{ type: "attractions" }, { type: "text" }, { type: "gallery", settings: { albums: "area" } }],
  about: [{ type: "intro" }, { type: "text" }, { type: "reviews" }],
  location: [{ type: "place" }, { type: "faq" }],
} as const satisfies Record<string, readonly { type: PublicSectionType; settings?: Record<string, string> }[]>;

export type PageModelId = keyof typeof PAGE_MODELS;
export const PAGE_MODEL_IDS = Object.keys(PAGE_MODELS) as PageModelId[];

function emptyPageCopy(): Record<PublicLocale, PageCopy> {
  return Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, { title: "", lead: "", seoDescription: "" }]),
  ) as Record<PublicLocale, PageCopy>;
}

export function readSitePageDrafts(config: PublicSiteConfig): SitePageDraft[] {
  return [...config.sitePages]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((page) => {
      const copy = emptyPageCopy();
      for (const locale of PUBLIC_LOCALES) {
        copy[locale] = {
          title: pickOwnLocalized(page.title, locale),
          lead: pickOwnLocalized(page.lead, locale),
          seoDescription: pickOwnLocalized(page.seoDescription, locale),
        };
      }
      return {
        key: page.id,
        slug: page.slug,
        imageUrl: page.imageUrl ?? "",
        visible: page.visible,
        copy,
        sections: readSectionList(page.sections, false),
      };
    });
}

export function writeSitePages(config: PublicSiteConfig, pages: SitePageDraft[]): PublicSitePageInput[] {
  return pages.map((page, index) => {
    const saved = config.sitePages.find((row) => row.id === page.key);
    const text = (field: PageTextField, previous: unknown) =>
      writeLocalizedMap(
        previous as Parameters<typeof writeLocalizedMap>[0],
        Object.fromEntries(PUBLIC_LOCALES.map((locale) => [locale, page.copy[locale][field]])),
      );
    return {
      id: page.key,
      slug: page.slug.trim(),
      title: text("title", saved?.title),
      lead: text("lead", saved?.lead),
      seoDescription: text("seoDescription", saved?.seoDescription),
      imageUrl: page.imageUrl.trim() || null,
      visible: page.visible,
      sortOrder: index * 10,
      sections: writeSectionList(saved?.sections ?? [], page.sections),
    };
  });
}

/**
 * A new page from a model: named in the language being edited, at a free
 * address made from its name, with the model's sections. `newKey` makes ids
 * (the page's and each section's), so they stay the same once saved.
 */
export function createSitePageDraft(args: {
  name: string;
  model: PageModelId;
  locale: PublicLocale;
  takenSlugs: readonly string[];
  newKey: () => string;
}): SitePageDraft {
  const copy = emptyPageCopy();
  copy[args.locale].title = args.name.trim();
  const sections = PAGE_MODELS[args.model].map((entry) => {
    const section = newSectionDraft(entry.type, args.newKey());
    return "settings" in entry ? { ...section, settings: { ...section.settings, ...entry.settings } } : section;
  });
  return {
    key: args.newKey(),
    slug: freePageSlug(args.name, args.takenSlugs),
    imageUrl: "",
    visible: true,
    copy,
    sections: keepPinnedLast(sections),
  };
}

/** A page's own texts as translation slots: `page.<key>.<field>`. */
export function pageTextSlots(page: SitePageDraft, locale: PublicLocale): SectionTextSlot[] {
  return PAGE_TEXT_FIELDS.map((field) => ({
    path: `page.${page.key}.${field}`,
    value: page.copy[locale][field],
  }));
}

/** The slots that count towards a language being complete: the title and the line under it. */
export function pageProgressSlots(page: SitePageDraft, locale: PublicLocale): SectionTextSlot[] {
  return pageTextSlots(page, locale).filter((slot) => !slot.path.endsWith(".seoDescription"));
}

export function setPageText(
  page: SitePageDraft,
  locale: PublicLocale,
  field: PageTextField,
  value: string,
): SitePageDraft {
  return { ...page, copy: { ...page.copy, [locale]: { ...page.copy[locale], [field]: value } } };
}

/** Write a `page.<key>.<field>` slot; other paths leave the page as it is. */
export function setPageSlot(page: SitePageDraft, locale: PublicLocale, path: string, value: string): SitePageDraft {
  const prefix = `page.${page.key}.`;
  if (!path.startsWith(prefix)) return page;
  const field = path.slice(prefix.length) as PageTextField;
  return PAGE_TEXT_FIELDS.includes(field) ? setPageText(page, locale, field, value) : page;
}

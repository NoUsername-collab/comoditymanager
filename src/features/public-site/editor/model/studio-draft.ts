import { PUBLIC_STEPS_HREF } from "@/features/public-site/domain/anchors";
import { normalizeBrandColor } from "@/features/public-site/domain/brand-color";
import { coercePublicLocale } from "@/features/public-site/domain/localized";
import {
  alignNoticeDraft,
  bookingNoticeToDraft,
  mergeBookingNoticeFromLocales,
  type BookingNoticeDraft,
} from "@/features/public-site/domain/booking-notice";
import type {
  PublicMenuItem,
  PublicFontId,
  PublicLocale,
  PublicSiteConfig,
  PublicSiteSettingsInput,
  PublicUntranslatedCopy,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import {
  CHROME_COPY,
  HERO_COPY,
  HOMEPAGE_COPY_KEYS,
  PAGES_COPY,
  readFlatCopy,
  SEO_COPY,
  SEO_FALLBACK,
  writeCopyGroup,
  type FlatCopy,
} from "@/features/public-site/editor/model/copy-fields";
import {
  readSectionDrafts,
  removeSectionDraft,
  sectionTextSlots,
  writeSectionDrafts,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import {
  pageTextSlots,
  readSitePageDrafts,
  writeSitePages,
  type SitePageDraft,
} from "@/features/public-site/editor/model/site-page-draft";
import { defaultPublicMenu } from "@/features/public-site/domain/site-pages";
import { menuToSave } from "@/features/public-site/editor/model/menu-draft";

/** One language's copy outside the homepage sections: single-line fields and the booking notice. */
export type LocaleCopy = FlatCopy & {
  noticeDraft: BookingNoticeDraft;
};

export type PublicSiteStudioDraft = {
  editLocale: PublicLocale;
  templateId: PublicSiteSettingsInput["templateId"];
  themeId: PublicSiteSettingsInput["themeId"];
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicSiteSettingsInput["bookingNavPosition"];
  usePrimaryContact: boolean;
  heroImageUrl: string;
  logoUrl: string;
  ogImageUrl: string;
  fontId: PublicFontId;
  /** `#rrggbb`, or empty for the palette's own colour. */
  accentColor: string;
  showContactBar: boolean;
  /** The header menu; labels are per language inside each item. */
  menu: PublicMenuItem[];
  showCheckTimes: boolean;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryHref: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  contactFacebook: string;
  contactInstagram: string;
  /** The first page's sections in page order; each kind is described in `sections/<kind>/kind.ts`. */
  sections: SectionDraft[];
  /** The site's own pages, each with its sections. */
  pages: SitePageDraft[];
  copies: Record<PublicLocale, LocaleCopy>;
  /**
   * Per language: texts pasted in from another language and not translated yet.
   * Kept by value, not by field, because rows are renumbered on save; saved with
   * the site so it survives a reload.
   */
  copiedText: PublicUntranslatedCopy;
};

function buildLocaleCopy(config: PublicSiteConfig, locale: PublicLocale): LocaleCopy {
  return {
    ...readFlatCopy(config, locale),
    noticeDraft: bookingNoticeToDraft(config.bookingNotice, locale),
  };
}

export function buildPublicSiteStudioDraft(
  config: PublicSiteConfig,
  locale: string,
): PublicSiteStudioDraft {
  const copies = Object.fromEntries(
    PUBLIC_LOCALES.map((loc) => [loc, buildLocaleCopy(config, loc)]),
  ) as Record<PublicLocale, LocaleCopy>;

  return {
    editLocale: coercePublicLocale(locale),
    templateId: config.templateId,
    themeId: config.themeId,
    published: config.published,
    bookingEnabled: config.bookingEnabled,
    bookingNavPosition: config.bookingNavPosition,
    usePrimaryContact: config.usePrimaryContact ?? true,
    heroImageUrl: config.hero.imageUrl ?? "",
    logoUrl: config.chrome?.logoUrl ?? "",
    ogImageUrl: config.pages?.ogImageUrl ?? "",
    fontId: config.chrome?.fontId ?? "theme",
    accentColor: config.chrome?.accentColor ?? "",
    showContactBar: config.chrome?.showContactBar !== false,
    menu: config.chrome?.menu ?? defaultPublicMenu(),
    showCheckTimes: config.hero.showCheckTimes !== false,
    heroCtaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
    heroCtaSecondaryHref: config.hero.ctaSecondaryHref ?? PUBLIC_STEPS_HREF,
    contactEmail: config.contact.email ?? "",
    contactPhone: config.contact.phone ?? "",
    contactWhatsapp: config.contact.whatsapp ?? "",
    contactTelegram: config.contact.telegram ?? "",
    contactFacebook: config.contact.facebook ?? "",
    contactInstagram: config.contact.instagram ?? "",
    sections: readSectionDrafts(config),
    pages: readSitePageDrafts(config),
    copies,
    copiedText: config.untranslatedCopy,
  };
}

/** The booking notice's rows are shared by every language; keep the others in step. */
export function syncStudioStructure(
  draft: PublicSiteStudioDraft,
  fromLocale: PublicLocale = draft.editLocale,
): PublicSiteStudioDraft {
  const source = draft.copies[fromLocale];
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    if (locale === fromLocale) continue;
    copies[locale] = {
      ...copies[locale],
      noticeDraft: alignNoticeDraft(copies[locale].noticeDraft, source.noticeDraft),
    };
  }
  return { ...draft, copies };
}

export function switchStudioLocale(
  draft: PublicSiteStudioDraft,
  nextLocale: PublicLocale,
): PublicSiteStudioDraft {
  if (draft.editLocale === nextLocale) return draft;
  const source = draft.copies[draft.editLocale];
  const target = draft.copies[nextLocale];
  return {
    ...draft,
    editLocale: nextLocale,
    copies: {
      ...draft.copies,
      [nextLocale]: { ...target, noticeDraft: alignNoticeDraft(target.noticeDraft, source.noticeDraft) },
    },
  };
}

export function patchStudioCopy(
  draft: PublicSiteStudioDraft,
  partial: Partial<LocaleCopy>,
): PublicSiteStudioDraft {
  const locale = draft.editLocale;
  return {
    ...draft,
    copies: {
      ...draft.copies,
      [locale]: { ...draft.copies[locale], ...partial },
    },
  };
}

/** The sections of a page: the first page's (null), or an own page's by key. */
export function sectionsOf(draft: Pick<PublicSiteStudioDraft, "sections" | "pages">, pageKey: string | null): SectionDraft[] {
  if (!pageKey) return draft.sections;
  return draft.pages.find((page) => page.key === pageKey)?.sections ?? [];
}

/** Replace one page's sections. */
export function withSections(
  draft: PublicSiteStudioDraft,
  pageKey: string | null,
  sections: SectionDraft[],
): PublicSiteStudioDraft {
  if (!pageKey) return { ...draft, sections };
  return { ...draft, pages: draft.pages.map((page) => (page.key === pageKey ? { ...page, sections } : page)) };
}

/** The page a section is on: null for the first page, undefined when it is nowhere. */
export function pageKeyOfSection(draft: PublicSiteStudioDraft, sectionKey: string): string | null | undefined {
  if (draft.sections.some((section) => section.key === sectionKey)) return null;
  return draft.pages.find((page) => page.sections.some((section) => section.key === sectionKey))?.key;
}

/** Every section of the site with the page it is on, first page first. */
export function allSections(draft: Pick<PublicSiteStudioDraft, "sections" | "pages">): SectionDraft[] {
  return [...draft.sections, ...draft.pages.flatMap((page) => page.sections)];
}

/** Change every section, page by page. */
export function mapAllSections(
  draft: PublicSiteStudioDraft,
  update: (section: SectionDraft) => SectionDraft,
): PublicSiteStudioDraft {
  return {
    ...draft,
    sections: draft.sections.map(update),
    pages: draft.pages.map((page) => ({ ...page, sections: page.sections.map(update) })),
  };
}

/** Change one section, wherever it is; the rest of the draft is left as it is. */
export function patchStudioSection(
  draft: PublicSiteStudioDraft,
  key: string,
  update: (section: SectionDraft) => SectionDraft,
): PublicSiteStudioDraft {
  return mapAllSections(draft, (section) => (section.key === key ? update(section) : section));
}

/** Change one own page. */
export function patchStudioPage(
  draft: PublicSiteStudioDraft,
  key: string,
  update: (page: SitePageDraft) => SitePageDraft,
): PublicSiteStudioDraft {
  return { ...draft, pages: draft.pages.map((page) => (page.key === key ? update(page) : page)) };
}

function menuWithout(menu: PublicMenuItem[], gone: (item: PublicMenuItem) => boolean): PublicMenuItem[] {
  return menu
    .filter((item) => !gone(item))
    .map((item) =>
      item.children ? { ...item, children: item.children.filter((child) => !gone(child)) } : item,
    );
}

/** Take a page away, with its sections and the menu links to them. */
export function removeStudioPage(draft: PublicSiteStudioDraft, key: string): PublicSiteStudioDraft {
  const page = draft.pages.find((row) => row.key === key);
  if (!page) return draft;
  const sectionKeys = new Set(page.sections.map((section) => section.key));
  return {
    ...draft,
    pages: draft.pages.filter((row) => row.key !== key),
    menu: menuWithout(
      draft.menu,
      (item) =>
        (item.kind === "page" && item.ref === key) || (item.kind === "section" && sectionKeys.has(item.ref ?? "")),
    ),
  };
}

/** Take a section away from its page, and the menu links to it. */
export function removeStudioSection(draft: PublicSiteStudioDraft, key: string): PublicSiteStudioDraft {
  const pageKey = pageKeyOfSection(draft, key);
  if (pageKey === undefined) return draft;
  const next = withSections(draft, pageKey, removeSectionDraft(sectionsOf(draft, pageKey), key));
  return { ...next, menu: menuWithout(draft.menu, (item) => item.kind === "section" && item.ref === key) };
}

/** Every text of one language's site: the first page, the own pages, their sections and rows. */
export function homepageTexts(draft: PublicSiteStudioDraft, locale: PublicLocale): string[] {
  const copy = draft.copies[locale];
  return [
    ...HOMEPAGE_COPY_KEYS.map((key) => copy[key]),
    ...draft.pages.flatMap((page) => pageTextSlots(page, locale).map((slot) => slot.value)),
    ...allSections(draft).flatMap((section) =>
      sectionTextSlots(section, locale).map((slot) => slot.value),
    ),
  ];
}

/** Copied texts still on the page as they were pasted; edited or removed ones drop out. */
function stillUntranslated(draft: PublicSiteStudioDraft): PublicUntranslatedCopy {
  const out: PublicUntranslatedCopy = {};
  for (const locale of PUBLIC_LOCALES) {
    const copied = draft.copiedText[locale];
    if (!copied?.length) continue;
    const present = new Set(homepageTexts(draft, locale));
    const kept = copied.filter((text) => present.has(text));
    if (kept.length > 0) out[locale] = kept;
  }
  return out;
}

export function mergeStudioToInput(args: {
  config: PublicSiteConfig;
  draft: PublicSiteStudioDraft;
}): PublicSiteSettingsInput {
  const { config, draft } = args;
  const copies = draft.copies;

  const noticeDrafts = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, copies[locale].noticeDraft]),
  ) as Record<PublicLocale, BookingNoticeDraft>;

  return {
    untranslatedCopy: stillUntranslated(draft),
    templateId: draft.templateId,
    themeId: draft.themeId,
    published: draft.published,
    bookingEnabled: draft.bookingEnabled,
    bookingNavPosition: draft.bookingNavPosition,
    usePrimaryContact: draft.usePrimaryContact,
    hero: {
      ...config.hero,
      ...writeCopyGroup(HERO_COPY, config.hero, copies),
      ctaPrimaryHref: draft.heroCtaPrimaryHref.trim() || "/calendar",
      ctaSecondaryHref: draft.heroCtaSecondaryHref.trim() || PUBLIC_STEPS_HREF,
      imageUrl: draft.heroImageUrl.trim() || null,
      showCheckTimes: draft.showCheckTimes,
    },
    contact: {
      email: draft.contactEmail.trim() || null,
      phone: draft.contactPhone.trim() || null,
      whatsapp: draft.contactWhatsapp.trim() || null,
      telegram: draft.contactTelegram.trim() || null,
      facebook: draft.contactFacebook.trim() || null,
      instagram: draft.contactInstagram.trim() || null,
    },
    seo: writeCopyGroup(SEO_COPY, config.seo, copies, SEO_FALLBACK),
    bookingNotice: mergeBookingNoticeFromLocales(
      config.bookingNotice,
      noticeDrafts,
      draft.editLocale,
    ),
    chrome: {
      logoUrl: draft.logoUrl.trim() || null,
      showContactBar: draft.showContactBar,
      fontId: draft.fontId,
      accentColor: normalizeBrandColor(draft.accentColor),
      ...writeCopyGroup(CHROME_COPY, config.chrome, copies),
      menu: menuToSave(draft.menu),
    },
    pages: {
      ...writeCopyGroup(PAGES_COPY, config.pages, copies),
      ogImageUrl: draft.ogImageUrl.trim() || null,
    },
    sections: writeSectionDrafts(config, draft.sections),
    sitePages: writeSitePages(config, draft.pages),
  };
}

function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/** Sections after a conflict: changed ones are the operator's, the rest the colleague's. */
function mergeSections(
  base: SectionDraft[],
  mine: SectionDraft[],
  theirs: SectionDraft[],
): SectionDraft[] {
  const byKey = (list: SectionDraft[]) => new Map(list.map((section) => [section.key, section]));
  const baseByKey = byKey(base);
  const mineByKey = byKey(mine);
  const removedByMe = new Set(base.filter((s) => !mineByKey.has(s.key)).map((s) => s.key));

  const merged = theirs
    .filter((section) => !removedByMe.has(section.key))
    .map((section) => {
      const own = mineByKey.get(section.key);
      const start = baseByKey.get(section.key);
      return own && start && !sameValue(own, start) ? own : section;
    });
  const addedByMe = mine.filter((section) => !baseByKey.has(section.key));
  const all = [...merged, ...addedByMe.filter((s) => !merged.some((m) => m.key === s.key))];

  // The operator reordered: keep their order, with the colleague's new sections after.
  const order = (list: SectionDraft[]) => list.map((section) => section.key).join("|");
  if (order(mine) === order(base)) return all;
  const rank = new Map(mine.map((section, index) => [section.key, index]));
  return [...all].sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
}

/**
 * After a colleague saved first: every field the operator changed since `base`
 * (the version they started from) keeps their value; every other field takes the
 * colleague's (`theirs`). When both changed the same field, the operator's wins.
 */
export function mergeStudioDrafts(
  base: PublicSiteStudioDraft,
  mine: PublicSiteStudioDraft,
  theirs: PublicSiteStudioDraft,
): PublicSiteStudioDraft {
  const merged: Record<string, unknown> = { ...theirs };
  for (const key of Object.keys(mine) as (keyof PublicSiteStudioDraft)[]) {
    if (key === "copies" || key === "sections") continue;
    if (!sameValue(mine[key], base[key])) merged[key] = mine[key];
  }

  const copies = { ...theirs.copies };
  for (const locale of PUBLIC_LOCALES) {
    const own = mine.copies[locale];
    const start = base.copies[locale];
    const next: Record<string, unknown> = { ...theirs.copies[locale] };
    for (const key of Object.keys(own) as (keyof LocaleCopy)[]) {
      if (!sameValue(own[key], start[key])) next[key] = own[key];
    }
    copies[locale] = next as LocaleCopy;
  }

  return {
    ...(merged as PublicSiteStudioDraft),
    copies,
    sections: mergeSections(base.sections, mine.sections, theirs.sections),
    editLocale: mine.editLocale,
  };
}

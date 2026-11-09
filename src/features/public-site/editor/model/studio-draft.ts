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
  sectionTextSlots,
  writeSectionDrafts,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";

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
  showNavHome: boolean;
  showNavPrivacy: boolean;
  showNavTerms: boolean;
  showCheckTimes: boolean;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryHref: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  contactFacebook: string;
  contactInstagram: string;
  /** Homepage sections in page order; each kind is described in `sections/<kind>/kind.ts`. */
  sections: SectionDraft[];
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
    showNavHome: config.chrome?.showNavHome !== false,
    showNavPrivacy: config.chrome?.showNavPrivacy !== false,
    showNavTerms: config.chrome?.showNavTerms === true,
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

/** Change one section; the rest of the draft is left as it is. */
export function patchStudioSection(
  draft: PublicSiteStudioDraft,
  key: string,
  update: (section: SectionDraft) => SectionDraft,
): PublicSiteStudioDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) => (section.key === key ? update(section) : section)),
  };
}

/** Every text of one language's homepage, sections and their rows included. */
export function homepageTexts(draft: PublicSiteStudioDraft, locale: PublicLocale): string[] {
  const copy = draft.copies[locale];
  return [
    ...HOMEPAGE_COPY_KEYS.map((key) => copy[key]),
    ...draft.sections.flatMap((section) =>
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
      showNavHome: draft.showNavHome,
      showNavPrivacy: draft.showNavPrivacy,
      showNavTerms: draft.showNavTerms,
    },
    pages: {
      ...writeCopyGroup(PAGES_COPY, config.pages, copies),
      ogImageUrl: draft.ogImageUrl.trim() || null,
    },
    sections: writeSectionDrafts(config, draft.sections),
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

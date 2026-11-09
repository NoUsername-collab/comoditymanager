import { pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import type {
  LocalizedText,
  PublicLocale,
  PublicSiteConfig,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";

/*
 * Where every single-line piece of editor copy is stored. Adding a field means
 * one entry here: the draft reads it, the save writes it, and `LocaleCopy` gets
 * the key from these tables. Homepage sections describe their own text in
 * `sections/<kind>/kind.ts`; the booking notice is handled in studio-draft.
 */

/** Draft key → field of `config.hero`. */
export const HERO_COPY = {
  heroBadge: "badge",
  heroTitle: "title",
  heroSubtitle: "subtitle",
  heroTagline: "tagline",
  heroCtaPrimary: "ctaPrimary",
  heroCtaSecondary: "ctaSecondary",
  heroImageAlt: "imageAlt",
} as const;

/** Draft key → field of `config.seo`. */
export const SEO_COPY = {
  seoTitle: "metaTitle",
  seoDescription: "metaDescription",
} as const;

/** Search results fall back to the hero copy when the operator leaves SEO empty. */
export const SEO_FALLBACK = {
  seoTitle: "heroTitle",
  seoDescription: "heroSubtitle",
} as const;

/** Draft key → field of `config.chrome` (same names). */
export const CHROME_COPY = {
  headerSubtitle: "headerSubtitle",
  footerTagline: "footerTagline",
  navHome: "navHome",
  navPrivacy: "navPrivacy",
  navTerms: "navTerms",
  navBook: "navBook",
} as const;

/** Draft key → field of `config.pages` (same names). */
export const PAGES_COPY = {
  comingSoonTitle: "comingSoonTitle",
  comingSoonLead: "comingSoonLead",
  termsTitle: "termsTitle",
  termsLead: "termsLead",
  termsBody: "termsBody",
  privacyTitle: "privacyTitle",
  privacyLead: "privacyLead",
  privacyBody: "privacyBody",
  calendarTitle: "calendarTitle",
  calendarLead: "calendarLead",
  seoCalendarTitle: "seoCalendarTitle",
  seoCalendarDescription: "seoCalendarDescription",
  seoTermsTitle: "seoTermsTitle",
  seoTermsDescription: "seoTermsDescription",
  seoPrivacyTitle: "seoPrivacyTitle",
  seoPrivacyDescription: "seoPrivacyDescription",
} as const;

export type FlatCopyKey =
  | keyof typeof HERO_COPY
  | keyof typeof SEO_COPY
  | keyof typeof CHROME_COPY
  | keyof typeof PAGES_COPY;

/** All single-line copy of one language, keyed as the editor fields are. */
export type FlatCopy = Record<FlatCopyKey, string>;

/**
 * Strings visitors read on the homepage outside its sections (those come from
 * each section kind); legal pages, SEO and menu labels are not among them.
 */
export const HOMEPAGE_COPY_KEYS: readonly FlatCopyKey[] = [
  ...(Object.keys(HERO_COPY) as (keyof typeof HERO_COPY)[]),
  "headerSubtitle",
  "footerTagline",
];

/** A saved object holding copy fields (hero, chrome, a section payload, …). */
type CopySource = object | undefined;

function storedField(source: CopySource, field: string): LocalizedText | string | undefined {
  return (source as Record<string, LocalizedText | string | undefined> | undefined)?.[field];
}

function readGroup(
  map: Record<string, string>,
  source: CopySource,
  locale: PublicLocale,
  into: Record<string, string>,
) {
  for (const [key, field] of Object.entries(map)) {
    into[key] = pickOwnLocalized(storedField(source, field), locale);
  }
}

/** One language's single-line copy, read from the saved config. */
export function readFlatCopy(config: PublicSiteConfig, locale: PublicLocale): FlatCopy {
  const copy: Record<string, string> = {};
  readGroup(HERO_COPY, config.hero, locale, copy);
  readGroup(SEO_COPY, config.seo, locale, copy);
  readGroup(CHROME_COPY, config.chrome, locale, copy);
  readGroup(PAGES_COPY, config.pages, locale, copy);
  return copy as FlatCopy;
}

/**
 * The saved fields of one group, every language written from the drafts.
 * `previous` keeps languages the drafts don't cover; `fallback` fills an empty
 * value from another draft key.
 */
export function writeCopyGroup<M extends Record<string, string>>(
  map: M,
  previous: CopySource,
  copies: Record<PublicLocale, FlatCopy>,
  fallback: Partial<Record<keyof M, FlatCopyKey>> = {},
): Record<M[keyof M], LocalizedText> {
  const out: Record<string, LocalizedText> = {};
  for (const [key, field] of Object.entries(map)) {
    const values: Partial<Record<PublicLocale, string>> = {};
    for (const locale of PUBLIC_LOCALES) {
      const copy = copies[locale];
      const own = copy[key as FlatCopyKey];
      const alt = fallback[key as keyof M];
      values[locale] = own || (alt ? copy[alt] : "");
    }
    out[field] = writeLocalizedMap(storedField(previous, field), values);
  }
  return out as Record<M[keyof M], LocalizedText>;
}

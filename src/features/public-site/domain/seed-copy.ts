import en from "../../../../messages/en.json";
import ro from "../../../../messages/ro.json";
import bg from "../../../../messages/bg.json";
import { localizedFromTriad } from "@/features/public-site/domain/localized";
import {
  PUBLIC_LOCALES,
  type LocalizedText,
  type PublicStockCopy,
} from "@/features/public-site/domain/types";

type HomeMessages = typeof en.public.home;

function triad(pick: (home: HomeMessages) => string): LocalizedText {
  return localizedFromTriad({
    en: pick(en.public.home),
    ro: pick(ro.public.home),
    bg: pick(bg.public.home),
  });
}

export function seedPublicHomeCopy() {
  return {
    heroBadge: triad((h) => h.badge),
    heroSubtitle: triad((h) => h.subtitle),
    heroTagline: triad((h) => h.tagline),
    ctaPrimary: triad((h) => h.ctaBook),
    ctaSecondary: triad((h) => h.ctaHow),
    introTitle: triad((h) => h.aboutTitle),
    introLead: triad((h) => h.aboutLead),
    benefitsTitle: triad((h) => h.whyTitle),
    benefitsLead: triad((h) => h.whyLead),
    benefit1Title: triad((h) => h.feature1Title),
    benefit1Text: triad((h) => h.feature1Text),
    benefit2Title: triad((h) => h.feature2Title),
    benefit2Text: triad((h) => h.feature2Text),
    benefit3Title: triad((h) => h.feature3Title),
    benefit3Text: triad((h) => h.feature3Text),
    stepsTitle: triad((h) => h.stepsTitle),
    stepsLead: triad((h) => h.stepsLead),
    step1Title: triad((h) => h.step1Title),
    step1Text: triad((h) => h.step1Text),
    step2Title: triad((h) => h.step2Title),
    step2Text: triad((h) => h.step2Text),
    step3Title: triad((h) => h.step3Title),
    step3Text: triad((h) => h.step3Text),
    ctaBandTitle: triad((h) => h.ctaBandTitle),
    ctaBandText: triad((h) => h.ctaBandText),
    ctaBandButton: triad((h) => h.ctaBandButton),
    galleryTitle: triad((h) => h.galleryTitle),
  };
}

type NavMessages = typeof en.public.nav;
type PrivacyMessages = typeof en.public.privacy;
type TermsMessages = typeof en.public.terms;

function triadOf<M>(sections: { en: M; ro: M; bg: M }, build: (section: M) => string): LocalizedText {
  return localizedFromTriad({
    en: build(sections.en),
    ro: build(sections.ro),
    bg: build(sections.bg),
  });
}

const NAV = { en: en.public.nav, ro: ro.public.nav, bg: bg.public.nav };
const PRIVACY = { en: en.public.privacy, ro: ro.public.privacy, bg: bg.public.privacy };
const TERMS = { en: en.public.terms, ro: ro.public.terms, bg: bg.public.terms };

const nav = (build: (m: NavMessages) => string) => triadOf(NAV, build);

/** Menu labels a new site starts with; an empty label hides its link. */
export function seedPublicChromeCopy() {
  return {
    navHome: nav((m) => m.home),
    navPrivacy: nav((m) => m.gdpr),
    navTerms: nav((m) => m.terms),
    navBook: nav((m) => m.book),
  };
}

/** Plain-text privacy policy; `{email}` and `{name}` are filled in when the page renders. */
function privacyBody(m: PrivacyMessages): string {
  return [
    m.intro,
    `${m.collectTitle}\n• ${m.collect1}\n• ${m.collect2}\n• ${m.collect3}`,
    `${m.useTitle}\n${m.useBody}`,
    `${m.legalTitle}\n${m.legalBody}`,
    `${m.retentionTitle}\n${m.retentionBody}`,
    `${m.rightsTitle}\n${m.rightsBody}`,
  ].join("\n\n");
}

const UNPUBLISHED = { en: en.public.unpublished, ro: ro.public.unpublished, bg: bg.public.unpublished };

/**
 * Page copy a new site starts with: the "coming soon" page and the legal pages.
 * The terms body stays empty: the page then shows the cancellation policy built
 * from the booking rules.
 */
export function seedPublicPages() {
  const soon = (build: (m: typeof en.public.unpublished) => string) => triadOf(UNPUBLISHED, build);
  const privacy = (build: (m: PrivacyMessages) => string) => triadOf(PRIVACY, build);
  const terms = (build: (m: TermsMessages) => string) => triadOf(TERMS, build);
  return {
    comingSoonTitle: soon((m) => m.title),
    comingSoonLead: soon((m) => m.lead),
    privacyTitle: privacy((m) => m.title),
    privacyLead: privacy((m) => m.lead),
    privacyBody: privacy(privacyBody),
    termsTitle: terms((m) => m.title),
    termsLead: terms((m) => m.lead),
  };
}

/** Every default text, per language: the editor tells them from the operator's own. */
export function publicStockCopy(): PublicStockCopy {
  const triads: LocalizedText[] = [
    ...Object.values(seedPublicHomeCopy()),
    ...Object.values(seedPublicChromeCopy()),
    ...Object.values(seedPublicPages()),
  ];
  const stock = {} as Record<(typeof PUBLIC_LOCALES)[number], string[]>;
  for (const locale of PUBLIC_LOCALES) {
    stock[locale] = triads
      .map((triad) => triad[locale]?.trim() ?? "")
      .filter((text) => text.length > 0);
  }
  return stock;
}

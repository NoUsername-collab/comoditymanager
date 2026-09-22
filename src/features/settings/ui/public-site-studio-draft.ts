import { coercePublicLocale, pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import {
  alignNoticeDraft,
  bookingNoticeToDraft,
  mergeBookingNoticeFromLocales,
  type BookingNoticeDraft,
} from "@/features/public-site/domain/booking-notice";
import {
  normalizeBenefitIcon,
} from "@/features/public-site/domain/benefit-icons";
import type {
  PublicBenefitItem,
  PublicFontId,
  PublicGalleryItem,
  PublicLocale,
  PublicSiteConfig,
  PublicSiteSettingsInput,
  PublicStepItem,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";

export type GalleryDraftItem = { id: string; url: string };
export type CopyLineDraft = { icon: string; title: string; text: string };
export type StepLineDraft = { title: string; text: string };

export type TextLineDraft = { id: string; title: string; lead: string; body: string };

export type LocaleCopy = {
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroBadge: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  seoTitle: string;
  seoDescription: string;
  introTitle: string;
  introLead: string;
  benefitsTitle: string;
  benefitsLead: string;
  benefitItems: CopyLineDraft[];
  stepsTitle: string;
  stepsLead: string;
  stepItems: StepLineDraft[];
  ctaTitle: string;
  ctaLead: string;
  ctaLabel: string;
  galleryTitle: string;
  galleryLead: string;
  galleryCaptions: Record<string, string>;
  headerSubtitle: string;
  footerTagline: string;
  navHome: string;
  navPrivacy: string;
  navTerms: string;
  navBook: string;
  comingSoonTitle: string;
  comingSoonLead: string;
  termsTitle: string;
  termsLead: string;
  termsBody: string;
  privacyTitle: string;
  privacyLead: string;
  privacyBody: string;
  calendarTitle: string;
  calendarLead: string;
  seoCalendarTitle: string;
  seoCalendarDescription: string;
  seoTermsTitle: string;
  seoTermsDescription: string;
  seoPrivacyTitle: string;
  seoPrivacyDescription: string;
  textItems: TextLineDraft[];
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
  showContactBar: boolean;
  showStayOffers: boolean;
  showStayPrices: boolean;
  showPlace: boolean;
  showNavHome: boolean;
  showNavPrivacy: boolean;
  showNavTerms: boolean;
  showCheckTimes: boolean;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryHref: string;
  ctaHref: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  contactFacebook: string;
  contactInstagram: string;
  galleryItems: GalleryDraftItem[];
  galleryVisible: boolean;
  introVisible: boolean;
  benefitsVisible: boolean;
  stepsVisible: boolean;
  ctaVisible: boolean;
  textVisible: Record<string, boolean>;
  sectionOrder: string[];
  copies: Record<PublicLocale, LocaleCopy>;
};

let galleryDraftSeq = 0;
export function nextGalleryDraftId(): string {
  galleryDraftSeq += 1;
  return `gallery-draft-${galleryDraftSeq}`;
}

let textDraftSeq = 0;
export function nextTextDraftId(): string {
  textDraftSeq += 1;
  return `text-draft-${textDraftSeq}`;
}

export const MAX_BENEFIT_ITEMS = 12;
export const MAX_STEP_ITEMS = 12;
export const MAX_TEXT_SECTIONS = 8;

const EMPTY_BENEFITS: CopyLineDraft[] = [
  { icon: "bed", title: "", text: "" },
  { icon: "spark", title: "", text: "" },
  { icon: "handshake", title: "", text: "" },
];

const EMPTY_STEPS: StepLineDraft[] = [
  { title: "", text: "" },
  { title: "", text: "" },
  { title: "", text: "" },
];

function buildLocaleCopy(
  config: PublicSiteConfig,
  locale: PublicLocale,
  galleryItems: GalleryDraftItem[],
): LocaleCopy {
  const introSection = config.sections.find((section) => section.sectionType === "intro");
  const benefitsSection = config.sections.find((section) => section.sectionType === "benefits");
  const stepsSection = config.sections.find((section) => section.sectionType === "steps");
  const ctaSection = config.sections.find((section) => section.sectionType === "cta");
  const gallerySection = config.sections.find((section) => section.sectionType === "gallery");
  const galleryFromConfig = (gallerySection?.payload.items ?? []) as PublicGalleryItem[];

  const heroTitle = pickOwnLocalized(config.hero.title, locale);
  const heroSubtitle = pickOwnLocalized(config.hero.subtitle, locale);

  const benefitItems = ((benefitsSection?.payload.items ?? []) as PublicBenefitItem[]).map(
    (item) => ({
      icon: normalizeBenefitIcon(item.icon),
      title: pickOwnLocalized(item.title, locale),
      text: pickOwnLocalized(item.text, locale),
    }),
  );
  const stepItems = ((stepsSection?.payload.items ?? []) as PublicStepItem[]).map((item) => ({
    title: pickOwnLocalized(item.title, locale),
    text: pickOwnLocalized(item.text, locale),
  }));

  const galleryCaptions: Record<string, string> = {};
  for (const item of galleryItems) {
    const prev = galleryFromConfig.find((row) => row.id === item.id);
    galleryCaptions[item.id] = pickOwnLocalized(prev?.caption, locale);
  }

  return {
    heroTitle,
    heroSubtitle,
    heroTagline: pickOwnLocalized(config.hero.tagline, locale),
    heroBadge: pickOwnLocalized(config.hero.badge, locale),
    heroCtaPrimary: pickOwnLocalized(config.hero.ctaPrimary, locale),
    heroCtaSecondary: pickOwnLocalized(config.hero.ctaSecondary, locale),
    seoTitle: pickOwnLocalized(config.seo.metaTitle, locale),
    seoDescription: pickOwnLocalized(config.seo.metaDescription, locale),
    introTitle: pickOwnLocalized(introSection?.payload.title, locale),
    introLead: pickOwnLocalized(introSection?.payload.lead, locale),
    benefitsTitle: pickOwnLocalized(benefitsSection?.payload.title, locale),
    benefitsLead: pickOwnLocalized(benefitsSection?.payload.lead, locale),
    benefitItems: benefitItems.length > 0 ? benefitItems : EMPTY_BENEFITS.map((item) => ({ ...item })),
    stepsTitle: pickOwnLocalized(stepsSection?.payload.title, locale),
    stepsLead: pickOwnLocalized(stepsSection?.payload.lead, locale),
    stepItems: stepItems.length > 0 ? stepItems : EMPTY_STEPS.map((item) => ({ ...item })),
    ctaTitle: pickOwnLocalized(ctaSection?.payload.title, locale),
    ctaLead: pickOwnLocalized(ctaSection?.payload.lead, locale),
    ctaLabel: pickOwnLocalized(ctaSection?.payload.ctaLabel, locale),
    galleryCaptions,
    headerSubtitle: pickOwnLocalized(config.chrome?.headerSubtitle, locale),
    footerTagline: pickOwnLocalized(config.chrome?.footerTagline, locale),
    navHome: pickOwnLocalized(config.chrome?.navHome, locale),
    navPrivacy: pickOwnLocalized(config.chrome?.navPrivacy, locale),
    navTerms: pickOwnLocalized(config.chrome?.navTerms, locale),
    navBook: pickOwnLocalized(config.chrome?.navBook, locale),
    comingSoonTitle: pickOwnLocalized(config.pages?.comingSoonTitle, locale),
    comingSoonLead: pickOwnLocalized(config.pages?.comingSoonLead, locale),
    termsTitle: pickOwnLocalized(config.pages?.termsTitle, locale),
    termsLead: pickOwnLocalized(config.pages?.termsLead, locale),
    termsBody: pickOwnLocalized(config.pages?.termsBody, locale),
    privacyTitle: pickOwnLocalized(config.pages?.privacyTitle, locale),
    privacyLead: pickOwnLocalized(config.pages?.privacyLead, locale),
    privacyBody: pickOwnLocalized(config.pages?.privacyBody, locale),
    calendarTitle: pickOwnLocalized(config.pages?.calendarTitle, locale),
    calendarLead: pickOwnLocalized(config.pages?.calendarLead, locale),
    seoCalendarTitle: pickOwnLocalized(config.pages?.seoCalendarTitle, locale),
    seoCalendarDescription: pickOwnLocalized(config.pages?.seoCalendarDescription, locale),
    seoTermsTitle: pickOwnLocalized(config.pages?.seoTermsTitle, locale),
    seoTermsDescription: pickOwnLocalized(config.pages?.seoTermsDescription, locale),
    seoPrivacyTitle: pickOwnLocalized(config.pages?.seoPrivacyTitle, locale),
    seoPrivacyDescription: pickOwnLocalized(config.pages?.seoPrivacyDescription, locale),
    galleryTitle: pickOwnLocalized(gallerySection?.payload.title, locale),
    galleryLead: pickOwnLocalized(gallerySection?.payload.lead, locale),
    textItems: config.sections
      .filter((section) => section.sectionType === "text")
      .map((section) => ({
        id: section.id,
        title: pickOwnLocalized(section.payload.title, locale),
        lead: pickOwnLocalized(section.payload.lead, locale),
        body: pickOwnLocalized(section.payload.body, locale),
      })),
    noticeDraft: bookingNoticeToDraft(config.bookingNotice, locale),
  };
}

function alignCopyStructure(source: LocaleCopy, target: LocaleCopy): LocaleCopy {
  return {
    ...target,
    benefitItems: source.benefitItems.map((item, index) => ({
      icon: item.icon,
      title: target.benefitItems[index]?.title ?? "",
      text: target.benefitItems[index]?.text ?? "",
    })),
    stepItems: source.stepItems.map((item, index) => ({
      title: target.stepItems[index]?.title ?? "",
      text: target.stepItems[index]?.text ?? "",
    })),
    galleryCaptions: { ...target.galleryCaptions },
    textItems: source.textItems.map((item) => {
      const match = target.textItems.find((row) => row.id === item.id);
      return {
        id: item.id,
        title: match?.title ?? "",
        lead: match?.lead ?? "",
        body: match?.body ?? "",
      };
    }),
    noticeDraft: alignNoticeDraft(target.noticeDraft, source.noticeDraft),
  };
}

export function buildPublicSiteStudioDraft(
  config: PublicSiteConfig,
  locale: string,
): PublicSiteStudioDraft {
  const editLocale = coercePublicLocale(locale);
  const gallerySection = config.sections.find((section) => section.sectionType === "gallery");
  const visibility = new Map(
    config.sections.map((section) => [section.sectionType, section.visible]),
  );
  const galleryFromConfig = (gallerySection?.payload.items ?? []) as PublicGalleryItem[];
  const galleryItems = galleryFromConfig.map((item, index) => ({
    id: item.id || `gallery-${index}`,
    url: item.url,
  }));

  const copies = Object.fromEntries(
    PUBLIC_LOCALES.map((loc) => [loc, buildLocaleCopy(config, loc, galleryItems)]),
  ) as Record<PublicLocale, LocaleCopy>;

  const textSections = config.sections.filter((section) => section.sectionType === "text");
  const textVisible: Record<string, boolean> = {};
  for (const section of textSections) {
    textVisible[section.id] = section.visible;
  }

  const sectionOrder = [...config.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section) =>
      section.sectionType === "text" ? `text:${section.id}` : section.sectionType,
    );
  const defaultOrder = ["intro", "benefits", "gallery", "steps", "cta"];
  const order =
    sectionOrder.length > 0
      ? sectionOrder
      : defaultOrder;

  return {
    editLocale,
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
    showContactBar: config.chrome?.showContactBar !== false,
    showStayOffers: config.chrome?.showStayOffers !== false,
    showStayPrices: config.chrome?.showStayPrices !== false,
    showPlace: config.chrome?.showPlace !== false,
    showNavHome: config.chrome?.showNavHome !== false,
    showNavPrivacy: config.chrome?.showNavPrivacy !== false,
    showNavTerms: config.chrome?.showNavTerms === true,
    showCheckTimes: config.hero.showCheckTimes !== false,
    heroCtaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
    heroCtaSecondaryHref: config.hero.ctaSecondaryHref ?? "#public-intro",
    ctaHref:
      config.sections.find((section) => section.sectionType === "cta")?.payload.ctaHref ??
      "/calendar",
    contactEmail: config.contact.email ?? "",
    contactPhone: config.contact.phone ?? "",
    contactWhatsapp: config.contact.whatsapp ?? "",
    contactTelegram: config.contact.telegram ?? "",
    contactFacebook: config.contact.facebook ?? "",
    contactInstagram: config.contact.instagram ?? "",
    galleryItems,
    galleryVisible: gallerySection?.visible ?? false,
    introVisible: visibility.get("intro") ?? true,
    benefitsVisible: visibility.get("benefits") ?? true,
    stepsVisible: visibility.get("steps") ?? true,
    ctaVisible: visibility.get("cta") ?? true,
    textVisible,
    sectionOrder: order,
    copies,
  };
}

export function switchStudioLocale(
  draft: PublicSiteStudioDraft,
  nextLocale: PublicLocale,
): PublicSiteStudioDraft {
  if (draft.editLocale === nextLocale) return draft;
  const source = draft.copies[draft.editLocale];
  return {
    ...draft,
    editLocale: nextLocale,
    copies: {
      ...draft.copies,
      [nextLocale]: alignCopyStructure(source, draft.copies[nextLocale]),
    },
  };
}

export function syncStudioStructure(
  draft: PublicSiteStudioDraft,
  fromLocale: PublicLocale = draft.editLocale,
): PublicSiteStudioDraft {
  const source = draft.copies[fromLocale];
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    if (locale === fromLocale) continue;
    copies[locale] = alignCopyStructure(source, copies[locale]);
  }
  return { ...draft, copies };
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

function mapFromLocales(
  copies: Record<PublicLocale, LocaleCopy>,
  pick: (copy: LocaleCopy) => string,
): Partial<Record<PublicLocale, string>> {
  const values: Partial<Record<PublicLocale, string>> = {};
  for (const locale of PUBLIC_LOCALES) {
    values[locale] = pick(copies[locale]);
  }
  return values;
}

export function mergeStudioToInput(args: {
  config: PublicSiteConfig;
  draft: PublicSiteStudioDraft;
}): PublicSiteSettingsInput {
  const { config, draft } = args;
  const copies = draft.copies;
  const write = (
    previous: Parameters<typeof writeLocalizedMap>[0],
    pick: (copy: LocaleCopy) => string,
  ) => writeLocalizedMap(previous, mapFromLocales(copies, pick));

  const galleryFromConfig = config.sections.find((s) => s.sectionType === "gallery");
  const previousGallery = (galleryFromConfig?.payload.items ?? []) as PublicGalleryItem[];
  const galleryItems = draft.galleryItems
    .filter((item) => item.url.trim().length > 0)
    .map((item, index) => {
      const prev = previousGallery.find((row) => row.id === item.id) ?? previousGallery[index];
      return {
        id: item.id || `gallery-${index}`,
        url: item.url.trim(),
        caption: write(prev?.caption, (copy) => copy.galleryCaptions[item.id] ?? ""),
      };
    });

  const baseSections = config.sections.filter((section) => section.sectionType !== "gallery");

  const baseMapped = baseSections.map((section) => {
      if (section.sectionType === "intro") {
        return {
          ...section,
          visible: draft.introVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, (copy) => copy.introTitle),
            lead: write(section.payload.lead, (copy) => copy.introLead),
          },
        };
      }
      if (section.sectionType === "benefits") {
        const previous = (section.payload.items ?? []) as PublicBenefitItem[];
        const structure = copies[draft.editLocale].benefitItems;
        return {
          ...section,
          visible: draft.benefitsVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, (copy) => copy.benefitsTitle),
            lead: write(section.payload.lead, (copy) => copy.benefitsLead),
            items: structure.flatMap((item, index) => {
              const hasCopy = PUBLIC_LOCALES.some(
                (locale) =>
                  copies[locale].benefitItems[index]?.title.trim() ||
                  copies[locale].benefitItems[index]?.text.trim(),
              );
              if (!hasCopy) return [];
              return [
                {
                  icon: normalizeBenefitIcon(item.icon),
                  title: write(previous[index]?.title, (copy) => copy.benefitItems[index]?.title ?? ""),
                  text: write(previous[index]?.text, (copy) => copy.benefitItems[index]?.text ?? ""),
                },
              ];
            }),
          },
        };
      }
      if (section.sectionType === "steps") {
        const previous = (section.payload.items ?? []) as PublicStepItem[];
        const structure = copies[draft.editLocale].stepItems;
        return {
          ...section,
          visible: draft.stepsVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, (copy) => copy.stepsTitle),
            lead: write(section.payload.lead, (copy) => copy.stepsLead),
            items: structure.flatMap((_, index) => {
              const hasCopy = PUBLIC_LOCALES.some(
                (locale) =>
                  copies[locale].stepItems[index]?.title.trim() ||
                  copies[locale].stepItems[index]?.text.trim(),
              );
              if (!hasCopy) return [];
              return [
                {
                  title: write(previous[index]?.title, (copy) => copy.stepItems[index]?.title ?? ""),
                  text: write(previous[index]?.text, (copy) => copy.stepItems[index]?.text ?? ""),
                },
              ];
            }),
          },
        };
      }
      if (section.sectionType === "cta") {
        return {
          ...section,
          visible: draft.ctaVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, (copy) => copy.ctaTitle),
            lead: write(section.payload.lead, (copy) => copy.ctaLead),
            ctaLabel: write(section.payload.ctaLabel, (copy) => copy.ctaLabel),
            ctaHref: draft.ctaHref.trim() || "/calendar",
          },
        };
      }
      if (section.sectionType === "text") {
        const exists = copies[draft.editLocale].textItems.some((row) => row.id === section.id);
        if (!exists) return null;
        return {
          ...section,
          visible: draft.textVisible[section.id] !== false,
          payload: {
            title: write(section.payload.title, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.title ?? "",
            ),
            lead: write(section.payload.lead, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.lead ?? "",
            ),
            body: write(section.payload.body, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.body ?? "",
            ),
          },
        };
      }
      return section;
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const knownTextIds = new Set(
    config.sections.filter((section) => section.sectionType === "text").map((section) => section.id),
  );
  const extraText = copies[draft.editLocale].textItems
    .filter((item) => !knownTextIds.has(item.id))
    .map((item, index) => ({
      id: item.id,
      sectionType: "text" as const,
      sortOrder: 60 + index * 10,
      visible: draft.textVisible[item.id] !== false,
      payload: {
        title: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.title ?? ""),
        lead: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.lead ?? ""),
        body: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.body ?? ""),
      },
    }));

  const withGallery = [
    ...baseMapped,
    ...extraText,
    {
      id: galleryFromConfig?.id ?? "gallery",
      sectionType: "gallery" as const,
      sortOrder: galleryFromConfig?.sortOrder ?? 30,
      visible: draft.galleryVisible && galleryItems.length > 0,
      payload: {
        title: write(galleryFromConfig?.payload.title, (copy) => copy.galleryTitle),
        lead: write(galleryFromConfig?.payload.lead, (copy) => copy.galleryLead),
        items: galleryItems,
      },
    },
  ];

  const rank = new Map(draft.sectionOrder.map((key, index) => [key, index]));
  const sectionKey = (section: { id?: string; sectionType: string }) =>
    section.sectionType === "text" ? `text:${section.id}` : section.sectionType;
  const sections = withGallery
    .sort((a, b) => (rank.get(sectionKey(a)) ?? 99) - (rank.get(sectionKey(b)) ?? 99))
    .map((section, index) => {
      const { id: _id, ...rest } = section;
      return { ...rest, sortOrder: index * 10 };
    });

  const noticeDrafts = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, copies[locale].noticeDraft]),
  ) as Record<PublicLocale, BookingNoticeDraft>;

  return {
    templateId: draft.templateId,
    themeId: draft.themeId,
    published: draft.published,
    bookingEnabled: draft.bookingEnabled,
    bookingNavPosition: draft.bookingNavPosition,
    usePrimaryContact: draft.usePrimaryContact,
    hero: {
      ...config.hero,
      badge: write(config.hero.badge, (copy) => copy.heroBadge),
      title: write(config.hero.title, (copy) => copy.heroTitle),
      subtitle: write(config.hero.subtitle, (copy) => copy.heroSubtitle),
      tagline: write(config.hero.tagline, (copy) => copy.heroTagline),
      ctaPrimary: write(config.hero.ctaPrimary, (copy) => copy.heroCtaPrimary),
      ctaSecondary: write(config.hero.ctaSecondary, (copy) => copy.heroCtaSecondary),
      ctaPrimaryHref: draft.heroCtaPrimaryHref.trim() || "/calendar",
      ctaSecondaryHref: draft.heroCtaSecondaryHref.trim() || "#public-intro",
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
    seo: {
      metaTitle: write(config.seo.metaTitle, (copy) => copy.seoTitle || copy.heroTitle),
      metaDescription: write(
        config.seo.metaDescription,
        (copy) => copy.seoDescription || copy.heroSubtitle,
      ),
    },
    bookingNotice: mergeBookingNoticeFromLocales(
      config.bookingNotice,
      noticeDrafts,
      draft.editLocale,
    ),
    chrome: {
      logoUrl: draft.logoUrl.trim() || null,
      headerSubtitle: write(config.chrome?.headerSubtitle, (copy) => copy.headerSubtitle),
      footerTagline: write(config.chrome?.footerTagline, (copy) => copy.footerTagline),
      showContactBar: draft.showContactBar,
      showStayOffers: draft.showStayOffers,
      showStayPrices: draft.showStayPrices,
      showPlace: draft.showPlace,
      fontId: draft.fontId,
      navHome: write(config.chrome?.navHome, (copy) => copy.navHome),
      navPrivacy: write(config.chrome?.navPrivacy, (copy) => copy.navPrivacy),
      navTerms: write(config.chrome?.navTerms, (copy) => copy.navTerms),
      navBook: write(config.chrome?.navBook, (copy) => copy.navBook),
      showNavHome: draft.showNavHome,
      showNavPrivacy: draft.showNavPrivacy,
      showNavTerms: draft.showNavTerms,
    },
    pages: {
      comingSoonTitle: write(config.pages?.comingSoonTitle, (copy) => copy.comingSoonTitle),
      comingSoonLead: write(config.pages?.comingSoonLead, (copy) => copy.comingSoonLead),
      termsTitle: write(config.pages?.termsTitle, (copy) => copy.termsTitle),
      termsLead: write(config.pages?.termsLead, (copy) => copy.termsLead),
      termsBody: write(config.pages?.termsBody, (copy) => copy.termsBody),
      privacyTitle: write(config.pages?.privacyTitle, (copy) => copy.privacyTitle),
      privacyLead: write(config.pages?.privacyLead, (copy) => copy.privacyLead),
      privacyBody: write(config.pages?.privacyBody, (copy) => copy.privacyBody),
      calendarTitle: write(config.pages?.calendarTitle, (copy) => copy.calendarTitle),
      calendarLead: write(config.pages?.calendarLead, (copy) => copy.calendarLead),
      seoCalendarTitle: write(config.pages?.seoCalendarTitle, (copy) => copy.seoCalendarTitle),
      seoCalendarDescription: write(
        config.pages?.seoCalendarDescription,
        (copy) => copy.seoCalendarDescription,
      ),
      seoTermsTitle: write(config.pages?.seoTermsTitle, (copy) => copy.seoTermsTitle),
      seoTermsDescription: write(config.pages?.seoTermsDescription, (copy) => copy.seoTermsDescription),
      seoPrivacyTitle: write(config.pages?.seoPrivacyTitle, (copy) => copy.seoPrivacyTitle),
      seoPrivacyDescription: write(
        config.pages?.seoPrivacyDescription,
        (copy) => copy.seoPrivacyDescription,
      ),
      ogImageUrl: draft.ogImageUrl.trim() || null,
    },
    sections,
  };
}

export function addStudioBenefit(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  const current = draft.copies[draft.editLocale].benefitItems;
  if (current.length >= MAX_BENEFIT_ITEMS) return draft;
  return syncStudioStructure(
    patchStudioCopy(draft, {
      benefitItems: [...current, { icon: "spark", title: "", text: "" }],
    }),
  );
}

export function removeStudioBenefit(
  draft: PublicSiteStudioDraft,
  index: number,
): PublicSiteStudioDraft {
  return syncStudioStructure(
    patchStudioCopy(draft, {
      benefitItems: draft.copies[draft.editLocale].benefitItems.filter((_, i) => i !== index),
    }),
  );
}

export function addStudioStep(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  const current = draft.copies[draft.editLocale].stepItems;
  if (current.length >= MAX_STEP_ITEMS) return draft;
  return syncStudioStructure(
    patchStudioCopy(draft, {
      stepItems: [...current, { title: "", text: "" }],
    }),
  );
}

export function removeStudioStep(draft: PublicSiteStudioDraft, index: number): PublicSiteStudioDraft {
  return syncStudioStructure(
    patchStudioCopy(draft, {
      stepItems: draft.copies[draft.editLocale].stepItems.filter((_, i) => i !== index),
    }),
  );
}

export function addStudioTextSection(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  if (draft.copies[draft.editLocale].textItems.length >= MAX_TEXT_SECTIONS) return draft;
  const id = nextTextDraftId();
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    copies[locale] = {
      ...copies[locale],
      textItems: [...copies[locale].textItems, { id, title: "", lead: "", body: "" }],
    };
  }
  return {
    ...draft,
    copies,
    textVisible: { ...draft.textVisible, [id]: true },
    sectionOrder: [...draft.sectionOrder, `text:${id}`],
  };
}

export function removeStudioTextSection(
  draft: PublicSiteStudioDraft,
  id: string,
): PublicSiteStudioDraft {
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    copies[locale] = {
      ...copies[locale],
      textItems: copies[locale].textItems.filter((item) => item.id !== id),
    };
  }
  const { [id]: _removed, ...textVisible } = draft.textVisible;
  return {
    ...draft,
    copies,
    textVisible,
    sectionOrder: draft.sectionOrder.filter((key) => key !== `text:${id}`),
  };
}

export function moveStudioSection(
  draft: PublicSiteStudioDraft,
  key: string,
  direction: -1 | 1,
): PublicSiteStudioDraft {
  const order = [...draft.sectionOrder];
  const index = order.indexOf(key);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= order.length) return draft;
  const [moved] = order.splice(index, 1);
  order.splice(target, 0, moved!);
  return { ...draft, sectionOrder: order };
}

export function studioLocaleGaps(
  draft: PublicSiteStudioDraft,
): { locale: PublicLocale; missing: string[] }[] {
  return PUBLIC_LOCALES.map((locale) => {
    const copy = draft.copies[locale];
    const missing: string[] = [];
    if (!copy.heroTitle.trim()) missing.push("heroTitle");
    return { locale, missing };
  }).filter((row) => row.missing.length > 0);
}

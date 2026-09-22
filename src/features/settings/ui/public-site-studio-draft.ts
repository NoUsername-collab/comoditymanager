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
  galleryCaptions: Record<string, string>;
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
  copies: Record<PublicLocale, LocaleCopy>;
};

let galleryDraftSeq = 0;
export function nextGalleryDraftId(): string {
  galleryDraftSeq += 1;
  return `gallery-draft-${galleryDraftSeq}`;
}

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

  return {
    editLocale,
    templateId: config.templateId,
    themeId: config.themeId,
    published: config.published,
    bookingEnabled: config.bookingEnabled,
    bookingNavPosition: config.bookingNavPosition,
    usePrimaryContact: config.usePrimaryContact ?? true,
    heroImageUrl: config.hero.imageUrl ?? "",
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

  const sections = [
    ...baseSections.map((section) => {
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
            ctaHref: section.payload.ctaHref ?? "/calendar",
          },
        };
      }
      return section;
    }),
    {
      id: galleryFromConfig?.id ?? "gallery",
      sectionType: "gallery" as const,
      sortOrder: galleryFromConfig?.sortOrder ?? 30,
      visible: draft.galleryVisible && galleryItems.length > 0,
      payload: {
        title: galleryFromConfig?.payload.title ?? {},
        lead: galleryFromConfig?.payload.lead ?? {},
        items: galleryItems,
      },
    },
  ].map(({ id: _id, ...section }) => section);

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
      ctaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
      ctaSecondaryHref: config.hero.ctaSecondaryHref ?? "#public-intro",
      imageUrl: draft.heroImageUrl.trim() || null,
      showCheckTimes: config.hero.showCheckTimes ?? true,
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
    sections,
  };
}

import type {
  LocalizedText,
  PublicChromeConfig,
  PublicPagesConfig,
  PublicSiteConfig,
  PublicSiteSection,
  PublicTemplateId,
  PublicThemeId,
} from "./types";
import { defaultBookingNotice } from "./booking-notice";
import { defaultPublicChrome, defaultPublicPages } from "./chrome";
import { localizedFromString } from "./localized";
import { assignTemplateSectionSort } from "./order-sections";
import { emptyPublicPlace } from "./stay-offers";

type DefaultCopy = {
  heroBadge: LocalizedText | string;
  heroSubtitle: LocalizedText | string;
  heroTagline: LocalizedText | string;
  ctaPrimary: LocalizedText | string;
  ctaSecondary: LocalizedText | string;
  introTitle: LocalizedText | string;
  introLead: LocalizedText | string;
  benefitsTitle: LocalizedText | string;
  benefitsLead: LocalizedText | string;
  benefit1Title: LocalizedText | string;
  benefit1Text: LocalizedText | string;
  benefit2Title: LocalizedText | string;
  benefit2Text: LocalizedText | string;
  benefit3Title: LocalizedText | string;
  benefit3Text: LocalizedText | string;
  stepsTitle: LocalizedText | string;
  stepsLead: LocalizedText | string;
  step1Title: LocalizedText | string;
  step1Text: LocalizedText | string;
  step2Title: LocalizedText | string;
  step2Text: LocalizedText | string;
  step3Title: LocalizedText | string;
  step3Text: LocalizedText | string;
  ctaBandTitle: LocalizedText | string;
  ctaBandText: LocalizedText | string;
  ctaBandButton: LocalizedText | string;
  galleryTitle?: LocalizedText | string;
};

function loc(value: LocalizedText | string | undefined): LocalizedText {
  if (!value) return {};
  if (typeof value === "string") return localizedFromString(value);
  return value;
}

export function buildDefaultPublicSections(copy: DefaultCopy): PublicSiteSection[] {
  return [
    {
      id: "default-intro",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: {
        title: loc(copy.introTitle),
        lead: loc(copy.introLead),
      },
    },
    {
      id: "default-benefits",
      sectionType: "benefits",
      sortOrder: 20,
      visible: true,
      payload: {
        title: loc(copy.benefitsTitle),
        lead: loc(copy.benefitsLead),
        items: [
          {
            icon: "bed",
            title: loc(copy.benefit1Title),
            text: loc(copy.benefit1Text),
          },
          {
            icon: "spark",
            title: loc(copy.benefit2Title),
            text: loc(copy.benefit2Text),
          },
          {
            icon: "handshake",
            title: loc(copy.benefit3Title),
            text: loc(copy.benefit3Text),
          },
        ],
      },
    },
    {
      id: "default-gallery",
      sectionType: "gallery",
      sortOrder: 30,
      visible: false,
      payload: {
        title: loc(copy.galleryTitle ?? ""),
        lead: loc(""),
        items: [],
      },
    },
    {
      id: "default-steps",
      sectionType: "steps",
      sortOrder: 40,
      visible: true,
      payload: {
        title: loc(copy.stepsTitle),
        lead: loc(copy.stepsLead),
        items: [
          {
            title: loc(copy.step1Title),
            text: loc(copy.step1Text),
          },
          {
            title: loc(copy.step2Title),
            text: loc(copy.step2Text),
          },
          {
            title: loc(copy.step3Title),
            text: loc(copy.step3Text),
          },
        ],
      },
    },
    {
      id: "default-cta",
      sectionType: "cta",
      sortOrder: 50,
      visible: true,
      payload: {
        title: loc(copy.ctaBandTitle),
        lead: loc(copy.ctaBandText),
        ctaLabel: loc(copy.ctaBandButton),
        ctaHref: "/calendar",
      },
    },
  ];
}

export function buildDefaultPublicSiteConfig(args: {
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
  copy: DefaultCopy;
  contactEmail?: string;
  templateId?: PublicTemplateId;
  themeId?: PublicThemeId;
  chrome?: PublicChromeConfig;
  pages?: PublicPagesConfig;
}): PublicSiteConfig {
  return {
    id: "",
    templateId: args.templateId ?? "classic",
    themeId: args.themeId ?? "noir",
    published: true,
    bookingEnabled: true,
    bookingNavPosition: "nav",
    usePrimaryContact: true,
    displayName: args.displayName,
    checkInTime: args.checkInTime,
    checkOutTime: args.checkOutTime,
    hero: {
      badge: loc(args.copy.heroBadge),
      title: loc(args.displayName),
      subtitle: loc(args.copy.heroSubtitle),
      tagline: loc(args.copy.heroTagline),
      ctaPrimary: loc(args.copy.ctaPrimary),
      ctaSecondary: loc(args.copy.ctaSecondary),
      ctaPrimaryHref: "/calendar",
      ctaSecondaryHref: "#public-intro",
      showCheckTimes: true,
    },
    contact: {
      email: args.contactEmail ?? null,
    },
    seo: {
      metaTitle: loc(args.displayName),
      metaDescription: loc(args.copy.heroSubtitle),
    },
    bookingNotice: defaultBookingNotice(),
    chrome: { ...defaultPublicChrome(), ...args.chrome },
    pages: { ...defaultPublicPages(), ...args.pages },
    sections: assignTemplateSectionSort(
      buildDefaultPublicSections(args.copy),
      args.templateId ?? "classic",
    ),
    stayOffers: [],
    place: emptyPublicPlace(),
  };
}

export const PUBLIC_TEMPLATE_OPTIONS: PublicTemplateId[] = [
  "classic",
  "editorial",
  "immersive",
];

export const PUBLIC_THEME_OPTIONS: PublicThemeId[] = [
  "noir",
  "alpine",
  "mediterranean",
  "pearl",
  "slate",
  "forest",
];

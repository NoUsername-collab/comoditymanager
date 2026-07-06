import type {
  PublicSiteConfig,
  PublicSiteSection,
  PublicTemplateId,
  PublicThemeId,
} from "./types";
import { localizedFromString } from "./localized";

type DefaultCopy = {
  heroBadge: string;
  heroSubtitle: string;
  heroTagline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  introTitle: string;
  introLead: string;
  benefitsTitle: string;
  benefitsLead: string;
  benefit1Title: string;
  benefit1Text: string;
  benefit2Title: string;
  benefit2Text: string;
  benefit3Title: string;
  benefit3Text: string;
  stepsTitle: string;
  stepsLead: string;
  step1Title: string;
  step1Text: string;
  step2Title: string;
  step2Text: string;
  step3Title: string;
  step3Text: string;
  ctaBandTitle: string;
  ctaBandText: string;
  ctaBandButton: string;
};

export function buildDefaultPublicSections(copy: DefaultCopy): PublicSiteSection[] {
  return [
    {
      id: "default-intro",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: {
        title: localizedFromString(copy.introTitle),
        lead: localizedFromString(copy.introLead),
      },
    },
    {
      id: "default-benefits",
      sectionType: "benefits",
      sortOrder: 20,
      visible: true,
      payload: {
        title: localizedFromString(copy.benefitsTitle),
        lead: localizedFromString(copy.benefitsLead),
        items: [
          {
            icon: "🛏",
            title: localizedFromString(copy.benefit1Title),
            text: localizedFromString(copy.benefit1Text),
          },
          {
            icon: "✦",
            title: localizedFromString(copy.benefit2Title),
            text: localizedFromString(copy.benefit2Text),
          },
          {
            icon: "🤝",
            title: localizedFromString(copy.benefit3Title),
            text: localizedFromString(copy.benefit3Text),
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
        title: localizedFromString("Galerie"),
        lead: localizedFromString(""),
        items: [],
      },
    },
    {
      id: "default-steps",
      sectionType: "steps",
      sortOrder: 40,
      visible: true,
      payload: {
        title: localizedFromString(copy.stepsTitle),
        lead: localizedFromString(copy.stepsLead),
        items: [
          {
            title: localizedFromString(copy.step1Title),
            text: localizedFromString(copy.step1Text),
          },
          {
            title: localizedFromString(copy.step2Title),
            text: localizedFromString(copy.step2Text),
          },
          {
            title: localizedFromString(copy.step3Title),
            text: localizedFromString(copy.step3Text),
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
        title: localizedFromString(copy.ctaBandTitle),
        lead: localizedFromString(copy.ctaBandText),
        ctaLabel: localizedFromString(copy.ctaBandButton),
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
      badge: localizedFromString(args.copy.heroBadge),
      title: localizedFromString(args.displayName),
      subtitle: localizedFromString(args.copy.heroSubtitle),
      tagline: localizedFromString(args.copy.heroTagline),
      ctaPrimary: localizedFromString(args.copy.ctaPrimary),
      ctaSecondary: localizedFromString(args.copy.ctaSecondary),
      ctaPrimaryHref: "/calendar",
      ctaSecondaryHref: "#public-intro",
      showCheckTimes: true,
    },
    contact: {
      email: args.contactEmail ?? null,
    },
    seo: {
      metaTitle: localizedFromString(args.displayName),
      metaDescription: localizedFromString(args.copy.heroSubtitle),
    },
    sections: buildDefaultPublicSections(args.copy),
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

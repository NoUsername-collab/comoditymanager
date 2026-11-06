import { PUBLIC_STEPS_HREF } from "@/features/public-site/domain/anchors";
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
import { SECTION_KINDS } from "@/features/public-site/sections/kinds";
import { emptyPublicPlace } from "./stay-offers";

/** The default texts a new site's sections start with (see `seedPublicHomeCopy`). */
export type PublicDefaultCopy = {
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

/** One section of each kind that seeds itself, in the kinds' order. */
function buildDefaultPublicSections(copy: PublicDefaultCopy): PublicSiteSection[] {
  return Object.values(SECTION_KINDS).flatMap((kind, index) => {
    const seeded = kind.seed?.(copy);
    if (!seeded) return [];
    return [
      {
        id: `default-${kind.type}`,
        sectionType: kind.type,
        sortOrder: index * 10,
        visible: seeded.visible,
        payload: seeded.payload,
      } as PublicSiteSection,
    ];
  });
}

export function buildDefaultPublicSiteConfig(args: {
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
  copy: PublicDefaultCopy;
  contactEmail?: string;
  templateId?: PublicTemplateId;
  themeId?: PublicThemeId;
  chrome?: PublicChromeConfig;
  pages?: PublicPagesConfig;
}): PublicSiteConfig {
  return {
    id: "",
    version: null,
    templateId: args.templateId ?? "classic",
    themeId: args.themeId ?? "noir",
    // Not live until the operator publishes it (onboarding counts it as not set up).
    published: false,
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
      ctaSecondaryHref: PUBLIC_STEPS_HREF,
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
    untranslatedCopy: {},
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

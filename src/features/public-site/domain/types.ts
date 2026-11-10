export type PublicLocale = "ro" | "en" | "bg";

export const PUBLIC_LOCALES: PublicLocale[] = ["ro", "en", "bg"];

export type LocalizedText = Partial<Record<PublicLocale, string>>;

export type PublicTemplateId = "classic" | "editorial" | "immersive";
export type PublicThemeId = "noir" | "alpine" | "mediterranean" | "pearl" | "slate" | "forest";
export type PublicBookingNavPosition = "nav" | "footer" | "both" | "hidden";

export const PUBLIC_SECTION_TYPES = [
  "intro",
  "benefits",
  "gallery",
  "text",
  "cta",
  "steps",
  "stays",
  "place",
  "reviews",
  "faq",
  "amenities",
  "attractions",
  "video",
] as const;

export type PublicSectionType = (typeof PUBLIC_SECTION_TYPES)[number];

export type PublicHeroConfig = {
  badge?: LocalizedText;
  title?: LocalizedText;
  subtitle?: LocalizedText;
  tagline?: LocalizedText;
  ctaPrimary?: LocalizedText;
  ctaSecondary?: LocalizedText;
  ctaPrimaryHref?: string;
  ctaSecondaryHref?: string;
  imageUrl?: string | null;
  /** What the photo shows, for search engines and screen readers; empty keeps it decorative. */
  imageAlt?: LocalizedText;
  showCheckTimes?: boolean;
};

export type PublicContactConfig = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  facebook?: string | null;
  instagram?: string | null;
};

export type PublicSeoConfig = {
  metaTitle?: LocalizedText;
  metaDescription?: LocalizedText;
};

export type PublicFontId =
  | "theme"
  | "serif"
  | "sans"
  | "playfair"
  | "lora"
  | "cormorant"
  | "montserrat"
  | "raleway"
  | "nunito";

export type PublicChromeConfig = {
  logoUrl?: string | null;
  headerSubtitle?: LocalizedText;
  footerTagline?: LocalizedText;
  showContactBar?: boolean;
  fontId?: PublicFontId;
  /** The operator's own accent colour (`#rrggbb`) over the palette; null keeps the palette's. */
  accentColor?: string | null;
  navHome?: LocalizedText;
  navPrivacy?: LocalizedText;
  navTerms?: LocalizedText;
  navBook?: LocalizedText;
  showNavHome?: boolean;
  showNavPrivacy?: boolean;
  showNavTerms?: boolean;
};

export type PublicPagesConfig = {
  comingSoonTitle?: LocalizedText;
  comingSoonLead?: LocalizedText;
  termsTitle?: LocalizedText;
  termsLead?: LocalizedText;
  termsBody?: LocalizedText;
  privacyTitle?: LocalizedText;
  privacyLead?: LocalizedText;
  privacyBody?: LocalizedText;
  calendarTitle?: LocalizedText;
  calendarLead?: LocalizedText;
  seoCalendarTitle?: LocalizedText;
  seoCalendarDescription?: LocalizedText;
  seoTermsTitle?: LocalizedText;
  seoTermsDescription?: LocalizedText;
  seoPrivacyTitle?: LocalizedText;
  seoPrivacyDescription?: LocalizedText;
  ogImageUrl?: string | null;
};

export type BookingNoticePresetId =
  | "noPay"
  | "hold"
  | "hours"
  | "confirm"
  | "reply"
  | "payOnSite"
  | "idCheck"
  | "breakfast"
  | "parking"
  | "pets"
  | "children"
  | "cancel"
  | "custom";
export type BookingNoticeIconId =
  | "check"
  | "timer"
  | "clock"
  | "info"
  | "phone"
  | "card"
  | "key"
  | "meal"
  | "park"
  | "paw";

export type PublicBookingNoticeItem = {
  id: string;
  preset: BookingNoticePresetId;
  icon: BookingNoticeIconId;
  title: LocalizedText;
  text: LocalizedText;
};

export type PublicBookingNoticeConfig = {
  enabled: boolean;
  title: LocalizedText;
  items: PublicBookingNoticeItem[];
  footer: LocalizedText;
};

export type PublicBenefitItem = {
  icon?: string;
  title: LocalizedText;
  text: LocalizedText;
};

export type PublicGalleryItem = {
  id: string;
  url: string;
  caption?: LocalizedText;
  /** What the photo shows, for screen readers; the caption stands in when empty. */
  alt?: LocalizedText;
  category?: string;
};

export type PublicStepItem = {
  title: LocalizedText;
  text: LocalizedText;
};

/** An optional photo beside a text section; each layout places it its own way. */
type SectionPhoto = {
  imageUrl?: string;
  /** What the photo shows, for search engines and screen readers. */
  imageAlt?: LocalizedText;
};

type PublicSectionCopy = {
  title?: LocalizedText;
  lead?: LocalizedText;
};

/** What each kind of section stores; `sectionType` decides which one applies. */
export type PublicSectionPayloadByType = {
  intro: PublicSectionCopy & SectionPhoto & { body?: LocalizedText };
  text: PublicSectionCopy & SectionPhoto & { body?: LocalizedText };
  benefits: PublicSectionCopy & { items?: PublicBenefitItem[] };
  gallery: PublicSectionCopy & { items?: PublicGalleryItem[] };
  steps: PublicSectionCopy & { items?: PublicStepItem[] };
  cta: PublicSectionCopy & {
    ctaLabel?: LocalizedText;
    ctaHref?: string;
    ctaSecondaryLabel?: LocalizedText;
    ctaSecondaryHref?: string;
  };
  /** Room types, listed from the room settings, each with its photo and words. */
  stays: PublicSectionCopy & { showPrices?: boolean; items?: PublicStayItem[] };
  /** Address and map, from the property's details. */
  place: Record<string, never>;
  /** Guests' words: a quote, who said it and their stars. */
  reviews: PublicSectionCopy & { items?: PublicReviewItem[] };
  faq: PublicSectionCopy & { items?: PublicFaqItem[] };
  /** What the house offers, as icon and label. */
  amenities: PublicSectionCopy & { items?: PublicAmenityItem[] };
  /** Places to visit nearby. */
  attractions: PublicSectionCopy & { items?: PublicAttractionItem[] };
  /** A YouTube or Vimeo film. */
  video: PublicSectionCopy & { url?: string };
};

/** What the site shows for one room type; the type itself comes from the room settings. */
export type PublicStayItem = {
  roomTypeId: string;
  imageUrl?: string;
  text?: LocalizedText;
};

export type PublicReviewItem = { quote: LocalizedText; author: LocalizedText; rating?: number };
export type PublicFaqItem = { question: LocalizedText; answer: LocalizedText };
export type PublicAmenityItem = { icon?: string; label: LocalizedText };
export type PublicAttractionItem = { name: LocalizedText; text: LocalizedText; distance?: string };

export type PublicSectionPayload = PublicSectionPayloadByType[PublicSectionType];

export type PublicSiteSectionOf<T extends PublicSectionType> = {
  id: string;
  sectionType: T;
  sortOrder: number;
  visible: boolean;
  payload: PublicSectionPayloadByType[T];
};

/** One homepage section; narrowing on `sectionType` types its payload. */
export type PublicSiteSection = {
  [T in PublicSectionType]: PublicSiteSectionOf<T>;
}[PublicSectionType];

/** A section as the editor sends it: saved ones keep their id, new built-in ones have none yet. */
export type PublicSiteSectionInput = {
  [T in PublicSectionType]: Omit<PublicSiteSectionOf<T>, "id"> & { id?: string };
}[PublicSectionType];

export type PublicSiteSettingsRow = {
  id: string;
  /** Bumped by every save; null while nothing has been saved yet. */
  version: number | null;
  templateId: PublicTemplateId;
  themeId: PublicThemeId;
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicBookingNavPosition;
  usePrimaryContact: boolean;
  hero: PublicHeroConfig;
  contact: PublicContactConfig;
  seo: PublicSeoConfig;
  bookingNotice: PublicBookingNoticeConfig;
  chrome: PublicChromeConfig;
  pages: PublicPagesConfig;
  untranslatedCopy: PublicUntranslatedCopy;
};

/**
 * Per language: texts the editor copied in from another language that the
 * operator has not translated yet. Editor bookkeeping only; visitors never see it.
 */
export type PublicUntranslatedCopy = Partial<Record<PublicLocale, string[]>>;

/** Per language, the default texts a new site starts with (not written by the operator). */
export type PublicStockCopy = Record<PublicLocale, readonly string[]>;

export type PublicStayOffer = {
  id: string;
  name: string;
  capacity: number;
  fromPrice: number | null;
  roomCount: number;
};

export type PublicPlace = {
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export type PublicSiteConfig = PublicSiteSettingsRow & {
  sections: PublicSiteSection[];
  /** From pension_settings — not stored on public_site_settings */
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
  stayOffers: PublicStayOffer[];
  place: PublicPlace;
};

export type PublicSiteSettingsInput = {
  templateId: PublicTemplateId;
  themeId: PublicThemeId;
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicBookingNavPosition;
  usePrimaryContact: boolean;
  hero: PublicHeroConfig;
  contact: PublicContactConfig;
  seo: PublicSeoConfig;
  bookingNotice: PublicBookingNoticeConfig;
  chrome: PublicChromeConfig;
  pages: PublicPagesConfig;
  untranslatedCopy: PublicUntranslatedCopy;
  /** `id` is kept for saved sections and new text sections, so rows are updated in place. */
  sections: PublicSiteSectionInput[];
};

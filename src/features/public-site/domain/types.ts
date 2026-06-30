export type PublicLocale = "ro" | "en" | "bg";

export type LocalizedText = Partial<Record<PublicLocale, string>>;

export type PublicTemplateId = "classic" | "editorial" | "immersive";
export type PublicThemeId = "noir" | "alpine" | "mediterranean" | "pearl" | "slate" | "forest";
export type PublicBookingNavPosition = "nav" | "footer" | "both" | "hidden";

export type PublicSectionType =
  | "intro"
  | "benefits"
  | "gallery"
  | "text"
  | "cta"
  | "steps";

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

export type PublicBenefitItem = {
  icon?: string;
  title: LocalizedText;
  text: LocalizedText;
};

export type PublicGalleryItem = {
  id: string;
  url: string;
  caption?: LocalizedText;
  category?: string;
};

export type PublicStepItem = {
  title: LocalizedText;
  text: LocalizedText;
};

export type PublicSectionPayload = {
  title?: LocalizedText;
  lead?: LocalizedText;
  body?: LocalizedText;
  items?: PublicBenefitItem[] | PublicGalleryItem[] | PublicStepItem[];
  ctaLabel?: LocalizedText;
  ctaHref?: string;
  ctaSecondaryLabel?: LocalizedText;
  ctaSecondaryHref?: string;
};

export type PublicSiteSection = {
  id: string;
  sectionType: PublicSectionType;
  sortOrder: number;
  visible: boolean;
  payload: PublicSectionPayload;
};

export type PublicSiteSettingsRow = {
  id: string;
  templateId: PublicTemplateId;
  themeId: PublicThemeId;
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicBookingNavPosition;
  usePrimaryContact: boolean;
  hero: PublicHeroConfig;
  contact: PublicContactConfig;
  seo: PublicSeoConfig;
};

export type PublicSiteConfig = PublicSiteSettingsRow & {
  sections: PublicSiteSection[];
  /** From pension_settings — not stored on public_site_settings */
  displayName: string;
  checkInTime: string;
  checkOutTime: string;
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
  sections: Omit<PublicSiteSection, "id">[];
};

import type {
  PublicChromeConfig,
  PublicFontId,
  PublicPagesConfig,
} from "@/features/public-site/domain/types";

export const PUBLIC_FONT_OPTIONS: PublicFontId[] = ["theme", "serif", "sans"];

export const PUBLIC_FONT_STACK: Record<Exclude<PublicFontId, "theme">, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "ui-sans-serif, system-ui, sans-serif",
};

export function defaultPublicChrome(): PublicChromeConfig {
  return {
    showContactBar: true,
    fontId: "theme",
    showNavHome: true,
    showNavPrivacy: true,
    showNavTerms: false,
    showStayOffers: true,
    showStayPrices: true,
    showPlace: true,
  };
}

export function defaultPublicPages(): PublicPagesConfig {
  return {};
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function asBool(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function asFont(raw: unknown): PublicFontId {
  if (raw === "serif" || raw === "sans" || raw === "theme") return raw;
  return "theme";
}

function asUrl(raw: unknown): string | null | undefined {
  if (raw === null) return null;
  if (typeof raw === "string") return raw;
  return undefined;
}

export function normalizePublicChrome(raw: unknown): PublicChromeConfig {
  const row = asRecord(raw);
  const base = defaultPublicChrome();
  return {
    logoUrl: asUrl(row.logoUrl) ?? null,
    headerSubtitle: (row.headerSubtitle ?? {}) as PublicChromeConfig["headerSubtitle"],
    footerTagline: (row.footerTagline ?? {}) as PublicChromeConfig["footerTagline"],
    showContactBar: asBool(row.showContactBar, base.showContactBar ?? true),
    fontId: asFont(row.fontId),
    navHome: (row.navHome ?? {}) as PublicChromeConfig["navHome"],
    navPrivacy: (row.navPrivacy ?? {}) as PublicChromeConfig["navPrivacy"],
    navTerms: (row.navTerms ?? {}) as PublicChromeConfig["navTerms"],
    navBook: (row.navBook ?? {}) as PublicChromeConfig["navBook"],
    showNavHome: asBool(row.showNavHome, true),
    showNavPrivacy: asBool(row.showNavPrivacy, true),
    showNavTerms: asBool(row.showNavTerms, false),
    showStayOffers: asBool(row.showStayOffers, true),
    showStayPrices: asBool(row.showStayPrices, true),
    showPlace: asBool(row.showPlace, true),
  };
}

export function normalizePublicPages(raw: unknown): PublicPagesConfig {
  const row = asRecord(raw);
  return {
    comingSoonTitle: (row.comingSoonTitle ?? {}) as PublicPagesConfig["comingSoonTitle"],
    comingSoonLead: (row.comingSoonLead ?? {}) as PublicPagesConfig["comingSoonLead"],
    termsTitle: (row.termsTitle ?? {}) as PublicPagesConfig["termsTitle"],
    termsLead: (row.termsLead ?? {}) as PublicPagesConfig["termsLead"],
    termsBody: (row.termsBody ?? {}) as PublicPagesConfig["termsBody"],
    privacyTitle: (row.privacyTitle ?? {}) as PublicPagesConfig["privacyTitle"],
    privacyLead: (row.privacyLead ?? {}) as PublicPagesConfig["privacyLead"],
    privacyBody: (row.privacyBody ?? {}) as PublicPagesConfig["privacyBody"],
    calendarTitle: (row.calendarTitle ?? {}) as PublicPagesConfig["calendarTitle"],
    calendarLead: (row.calendarLead ?? {}) as PublicPagesConfig["calendarLead"],
    seoCalendarTitle: (row.seoCalendarTitle ?? {}) as PublicPagesConfig["seoCalendarTitle"],
    seoCalendarDescription: (row.seoCalendarDescription ?? {}) as PublicPagesConfig["seoCalendarDescription"],
    seoTermsTitle: (row.seoTermsTitle ?? {}) as PublicPagesConfig["seoTermsTitle"],
    seoTermsDescription: (row.seoTermsDescription ?? {}) as PublicPagesConfig["seoTermsDescription"],
    seoPrivacyTitle: (row.seoPrivacyTitle ?? {}) as PublicPagesConfig["seoPrivacyTitle"],
    seoPrivacyDescription: (row.seoPrivacyDescription ?? {}) as PublicPagesConfig["seoPrivacyDescription"],
    ogImageUrl: asUrl(row.ogImageUrl) ?? null,
  };
}

export function publicChromeFontStack(fontId: PublicFontId | undefined): string | null {
  if (fontId === "serif" || fontId === "sans") return PUBLIC_FONT_STACK[fontId];
  return null;
}

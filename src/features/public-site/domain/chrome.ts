import { normalizeBrandColor } from "@/features/public-site/domain/brand-color";
import { defaultPublicMenu, normalizePublicMenu } from "@/features/public-site/domain/site-pages";
import type {
  PublicChromeConfig,
  PublicFontId,
  PublicPagesConfig,
  PublicTemplateId,
} from "@/features/public-site/domain/types";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";

/**
 * Heading fonts. The web fonts are declared once on the root layout
 * (`design/fonts/public-fonts`) without preloading, so a visitor's browser
 * downloads only the one the site uses.
 */
const PUBLIC_FONT_STACK: Record<Exclude<PublicFontId, "theme">, string> = {
  serif: SERIF,
  sans: SANS,
  playfair: `var(--font-pub-playfair), ${SERIF}`,
  lora: `var(--font-pub-lora), ${SERIF}`,
  cormorant: `var(--font-pub-cormorant), ${SERIF}`,
  montserrat: `var(--font-pub-montserrat), ${SANS}`,
  raleway: `var(--font-pub-raleway), ${SANS}`,
  nunito: `var(--font-pub-nunito), ${SANS}`,
};

export const PUBLIC_FONT_OPTIONS: PublicFontId[] = ["theme", ...(Object.keys(PUBLIC_FONT_STACK) as PublicFontId[])];

/**
 * The heading font each layout suggests, used while the operator keeps the
 * default ("theme"): a magazine reads in a high-contrast serif, a full-screen
 * photo carries a refined display serif, the brochure keeps the palette's own.
 * A font the operator picks always wins.
 */
export const LAYOUT_SUGGESTED_FONT: Record<PublicTemplateId, Exclude<PublicFontId, "theme"> | null> = {
  classic: null,
  editorial: "playfair",
  immersive: "cormorant",
};

export function defaultPublicChrome(): PublicChromeConfig {
  return {
    showContactBar: true,
    fontId: "theme",
    accentColor: null,
    menu: defaultPublicMenu(),
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
  return PUBLIC_FONT_OPTIONS.includes(raw as PublicFontId) ? (raw as PublicFontId) : "theme";
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
    accentColor: normalizeBrandColor(row.accentColor),
    navHome: (row.navHome ?? {}) as PublicChromeConfig["navHome"],
    navPrivacy: (row.navPrivacy ?? {}) as PublicChromeConfig["navPrivacy"],
    navTerms: (row.navTerms ?? {}) as PublicChromeConfig["navTerms"],
    navBook: (row.navBook ?? {}) as PublicChromeConfig["navBook"],
    menu: normalizePublicMenu(row.menu),
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

/**
 * The heading font stack: the operator's pick, else the layout's suggestion,
 * else null for the palette's own.
 */
export function publicChromeFontStack(
  fontId: PublicFontId | undefined,
  templateId?: PublicTemplateId,
): string | null {
  if (!fontId || fontId === "theme") {
    const suggested = templateId ? LAYOUT_SUGGESTED_FONT[templateId] : null;
    return suggested ? PUBLIC_FONT_STACK[suggested] : null;
  }
  return PUBLIC_FONT_STACK[fontId] ?? null;
}

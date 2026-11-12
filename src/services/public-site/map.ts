import { normalizeBookingNotice } from "@/features/public-site/domain/booking-notice";
import {
  normalizePublicChrome,
  normalizePublicPages,
} from "@/features/public-site/domain/chrome";
import type {
  PublicBookingNoticeConfig,
  PublicBookingNavPosition,
  PublicContactConfig,
  PublicHeroConfig,
  PublicSectionType,
  PublicSeoConfig,
  LocalizedText,
  PublicSitePage,
  PublicSiteSection,
  PublicSiteSettingsRow,
  PublicTemplateId,
  PublicThemeId,
  PublicUntranslatedCopy,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES, PUBLIC_SECTION_TYPES } from "@/features/public-site/domain/types";

function parseTemplateId(raw: unknown): PublicTemplateId {
  if (raw === "editorial" || raw === "immersive" || raw === "classic") {
    return raw;
  }
  return "classic";
}

function parseThemeId(raw: unknown): PublicThemeId {
  if (raw === "alpine" || raw === "mediterranean" || raw === "noir" ||
      raw === "pearl" || raw === "slate" || raw === "forest") {
    return raw;
  }
  return "noir";
}

function parseBookingNav(raw: unknown): PublicBookingNavPosition {
  if (raw === "footer" || raw === "both" || raw === "hidden") return raw;
  return "nav";
}

function parseSectionType(raw: unknown): PublicSectionType {
  return (PUBLIC_SECTION_TYPES as readonly unknown[]).includes(raw)
    ? (raw as PublicSectionType)
    : "text";
}

function parseUntranslatedCopy(raw: unknown): PublicUntranslatedCopy {
  if (!raw || typeof raw !== "object") return {};
  const out: PublicUntranslatedCopy = {};
  for (const locale of PUBLIC_LOCALES) {
    const texts = (raw as Record<string, unknown>)[locale];
    if (Array.isArray(texts)) {
      out[locale] = texts.filter((text): text is string => typeof text === "string");
    }
  }
  return out;
}

export function mapPublicSiteSettingsRow(row: {
  id: string;
  version?: number | null;
  template_id: string;
  theme_id: string;
  published: boolean;
  booking_enabled: boolean;
  booking_nav_position: string;
  use_primary_contact?: boolean;
  hero: unknown;
  contact: unknown;
  seo: unknown;
  booking_notice?: unknown;
  chrome?: unknown;
  pages?: unknown;
  untranslated_copy?: unknown;
}): PublicSiteSettingsRow {
  return {
    id: row.id,
    version: row.version ?? 0,
    templateId: parseTemplateId(row.template_id),
    themeId: parseThemeId(row.theme_id),
    published: row.published !== false,
    bookingEnabled: row.booking_enabled !== false,
    bookingNavPosition: parseBookingNav(row.booking_nav_position),
    usePrimaryContact: row.use_primary_contact !== false,
    hero: (row.hero ?? {}) as PublicHeroConfig,
    contact: (row.contact ?? {}) as PublicContactConfig,
    seo: (row.seo ?? {}) as PublicSeoConfig,
    bookingNotice: normalizeBookingNotice(
      row.booking_notice as PublicBookingNoticeConfig | null | undefined
    ),
    chrome: normalizePublicChrome(row.chrome),
    pages: normalizePublicPages(row.pages),
    untranslatedCopy: parseUntranslatedCopy(row.untranslated_copy),
  };
}

export function mapPublicSiteSectionRow(row: {
  id: string;
  section_type: string;
  sort_order: number;
  visible: boolean;
  payload: unknown;
}): PublicSiteSection {
  // Trust boundary: payload is jsonb this app wrote through the per-type save
  // schema, so it matches its section_type.
  return {
    id: row.id,
    sectionType: parseSectionType(row.section_type),
    sortOrder: row.sort_order ?? 0,
    visible: row.visible !== false,
    payload: row.payload ?? {},
  } as PublicSiteSection;
}


export function mapPublicSitePageRow(
  row: {
    id: string;
    slug: string;
    title: unknown;
    lead: unknown;
    seo_description: unknown;
    image_url: string | null;
    visible: boolean;
    sort_order: number;
  },
  sections: PublicSiteSection[],
): PublicSitePage {
  return {
    id: row.id,
    slug: row.slug,
    title: (row.title ?? {}) as LocalizedText,
    lead: (row.lead ?? {}) as LocalizedText,
    seoDescription: (row.seo_description ?? {}) as LocalizedText,
    imageUrl: row.image_url?.trim() || null,
    visible: row.visible !== false,
    sortOrder: row.sort_order ?? 0,
    sections,
  };
}

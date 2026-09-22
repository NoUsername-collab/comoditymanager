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
  PublicSectionPayload,
  PublicSectionType,
  PublicSeoConfig,
  PublicSiteSection,
  PublicSiteSettingsRow,
  PublicTemplateId,
  PublicThemeId,
} from "@/features/public-site/domain/types";

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
  if (
    raw === "intro" ||
    raw === "benefits" ||
    raw === "gallery" ||
    raw === "text" ||
    raw === "cta" ||
    raw === "steps"
  ) {
    return raw;
  }
  return "text";
}

export function mapPublicSiteSettingsRow(row: {
  id: string;
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
}): PublicSiteSettingsRow {
  return {
    id: row.id,
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
  };
}

export function mapPublicSiteSectionRow(row: {
  id: string;
  section_type: string;
  sort_order: number;
  visible: boolean;
  payload: unknown;
}): PublicSiteSection {
  return {
    id: row.id,
    sectionType: parseSectionType(row.section_type),
    sortOrder: row.sort_order ?? 0,
    visible: row.visible !== false,
    payload: (row.payload ?? {}) as PublicSectionPayload,
  };
}

export function isPublicSiteMigrationMissing(message: string): boolean {
  return (
    message.includes("public_site_settings") ||
    message.includes("public_site_sections")
  );
}

/** Postgres/PostgREST when the 14-arg RPC (chrome/pages) is not deployed yet. */
export function isPublicSiteRpcMissing(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("could not find the function") ||
    (text.includes("upsert_public_site_settings_atomic") &&
      (text.includes("schema cache") || text.includes("does not exist")))
  );
}

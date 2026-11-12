import { cache } from "react";
import { loadPublicMedia } from "@/services/public-site/media-photos";
import { unstable_cache } from "next/cache";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import {
  seedPublicChromeCopy,
  seedPublicHomeCopy,
  seedPublicPages,
} from "@/features/public-site/domain/seed-copy";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { getPensionSettingsForTenant } from "@/services/pension-settings";
import { getPensionIdentity, getPensionIdentityForTenant } from "@/services/pension-identity";
import { resolvePensionStayTimes } from "@/lib/constants";
import { finalizePublicSiteConfig } from "@/domain/public-site/resolve-config";
import { loadPublicPlace } from "./place";
import { loadPublicStayOffers } from "./stay-offers";
import {
  mapPublicSitePageRow,
  mapPublicSiteSectionRow,
  mapPublicSiteSettingsRow,
} from "./map";

async function getPublicSiteConfigUncached(
  tenantId: string
): Promise<PublicSiteConfig> {
  // Tenant passed explicitly: this runs inside unstable_cache, without request headers.
  // Errors propagate: a failed read must not show another business's defaults.
  const [pension, identity, stayOffers, place, media] = await Promise.all([
    getPensionSettingsForTenant(tenantId),
    getPensionIdentityForTenant(tenantId),
    loadPublicStayOffers(tenantId),
    loadPublicPlace(tenantId),
    loadPublicMedia(tenantId),
  ]);
  const copy = seedPublicHomeCopy();

  const identityLogo = identity.logoUrl;
  const displayName = identity.displayName;
  const { checkIn: checkInTime, checkOut: checkOutTime } =
    resolvePensionStayTimes(pension);
  const fallback = buildDefaultPublicSiteConfig({
    displayName,
    checkInTime,
    checkOutTime,
    copy,
    contactEmail: identity.contact.email ?? undefined,
    chrome: seedPublicChromeCopy(),
    pages: seedPublicPages(),
  });
  fallback.stayOffers = stayOffers;
  fallback.place = place;
  fallback.media = media;

  const supabase = createPublicAdminClient();
  const [settingsResult, sectionsResult, pagesResult] = await Promise.all([
    supabase
      .from("public_site_settings")
      .select(
        "id, version, template_id, theme_id, published, booking_enabled, booking_nav_position, use_primary_contact, hero, contact, seo, booking_notice, chrome, pages, untranslated_copy",
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("public_site_sections")
      .select("id, page_id, section_type, sort_order, visible, payload")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_site_pages")
      .select("id, slug, title, lead, seo_description, image_url, visible, sort_order")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);

  if (!settingsResult.data) {
    return stampIdentityLogo(fallback, identityLogo);
  }

  if (sectionsResult.error) throw new Error(sectionsResult.error.message);
  if (pagesResult.error) throw new Error(pagesResult.error.message);

  const settings = mapPublicSiteSettingsRow(settingsResult.data);
  const sectionRows = sectionsResult.data ?? [];
  // The first page's sections have no page; each own page gets its own.
  const sections = sectionRows.filter((row) => !row.page_id).map(mapPublicSiteSectionRow);
  const sitePages = (pagesResult.data ?? []).map((row) =>
    mapPublicSitePageRow(
      row,
      sectionRows.filter((section) => section.page_id === row.id).map(mapPublicSiteSectionRow),
    ),
  );
  const primaryContact = identity.contact;

  return finalizePublicSiteConfig(settings, sections, {
    displayName,
    checkInTime,
    checkOutTime,
    primaryContact,
    fallbackSections: fallback.sections,
    fallbackContactEmail: fallback.contact.email,
    stayOffers,
    place,
    media,
    sitePages,
    logoUrl: identityLogo,
  });
}

function stampIdentityLogo(
  config: PublicSiteConfig,
  logoUrl: string | null | undefined,
): PublicSiteConfig {
  if (logoUrl === undefined) return config;
  return {
    ...config,
    chrome: {
      ...config.chrome,
      logoUrl: logoUrl?.trim() || null,
    },
  };
}

const getCachedPublicSiteConfig = (tenantId: string) =>
  unstable_cache(
    () => getPublicSiteConfigUncached(tenantId),
    ["public-site-config", tenantId],
    {
      tags: [
        CACHE_TAGS.publicSite,
        tenantTag(tenantId, CACHE_TAGS.publicSite),
        CACHE_TAGS.rooms,
        tenantTag(tenantId, CACHE_TAGS.rooms),
        CACHE_TAGS.roomCatalog,
        tenantTag(tenantId, CACHE_TAGS.roomCatalog),
        // Name, logo, contact and check-in times come from the pension settings.
        CACHE_TAGS.pensionSettings,
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
        // Galleries and room photos come from the photo library.
        CACHE_TAGS.media,
        tenantTag(tenantId, CACHE_TAGS.media),
      ],
      revalidate: 120,
    }
  );

const loadPublicSiteConfig = cache(async () => {
  const tenantId = await resolveTenantIdForData();
  return getCachedPublicSiteConfig(tenantId)();
});

export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  return loadPublicSiteConfig();
}

/** Admin reads use the same cached loader; save actions revalidate tags. */
export async function getPublicSiteConfigForAdmin(): Promise<PublicSiteConfig> {
  return loadPublicSiteConfig();
}

type PublicSiteAdminBundle = {
  config: PublicSiteConfig;
  primaryContact: PensionContact;
};

/** Config + pension contact for settings UI — parallel cached service boundary. */
export const getPublicSiteAdminBundle = cache(
  async (): Promise<PublicSiteAdminBundle> => {
    const [config, identity] = await Promise.all([
      loadPublicSiteConfig(),
      getPensionIdentity(),
    ]);

    return { config, primaryContact: identity.contact };
  },
);

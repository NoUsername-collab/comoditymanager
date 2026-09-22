import { cache } from "react";
import { unstable_cache } from "next/cache";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import { seedPublicHomeCopy } from "@/features/public-site/domain/seed-copy";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import {
  EMPTY_PENSION_CONTACT,
  type PensionContact,
} from "@/domain/settings/pension-identity";
import { getPensionSettings } from "@/services/pension-settings";
import { getPensionIdentity } from "@/services/pension-identity";
import { resolvePensionStayTimes } from "@/lib/constants";
import { finalizePublicSiteConfig } from "@/domain/public-site/resolve-config";
import { loadPublicPlace } from "./place";
import { loadPublicStayOffers } from "./stay-offers";
import {
  isPublicSiteMigrationMissing,
  mapPublicSiteSectionRow,
  mapPublicSiteSettingsRow,
} from "./map";

async function getPublicSiteConfigUncached(
  tenantId: string
): Promise<PublicSiteConfig> {
  const [pension, identity, stayOffers, place] = await Promise.all([
    getPensionSettings().catch(() => null),
    getPensionIdentity().catch(() => null),
    loadPublicStayOffers(tenantId),
    loadPublicPlace(tenantId),
  ]);
  const copy = seedPublicHomeCopy();

  const displayName = identity?.displayName ?? pension?.display_name ?? "Casa Emil";
  const { checkIn: checkInTime, checkOut: checkOutTime } =
    resolvePensionStayTimes(pension);
  const fallback = buildDefaultPublicSiteConfig({
    displayName,
    checkInTime,
    checkOutTime,
    copy,
    contactEmail: identity?.contact.email ?? undefined,
  });
  fallback.stayOffers = stayOffers;
  fallback.place = place;

  const supabase = createPublicAdminClient();
  const settingsColumns =
    "id, template_id, theme_id, published, booking_enabled, booking_nav_position, use_primary_contact, hero, contact, seo";

  const [initialSettingsResult, sectionsResult] = await Promise.all([
    supabase
      .from("public_site_settings")
      .select(`${settingsColumns}, booking_notice, chrome, pages`)
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("public_site_sections")
      .select("id, section_type, sort_order, visible, payload")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),
  ]);

  let settingsResult = initialSettingsResult;
  if (
    settingsResult.error &&
    (settingsResult.error.message.includes("booking_notice") ||
      settingsResult.error.message.includes("chrome") ||
      settingsResult.error.message.includes("pages"))
  ) {
    settingsResult = await supabase
      .from("public_site_settings")
      .select(settingsColumns)
      .eq("tenant_id", tenantId)
      .maybeSingle();
  }

  if (settingsResult.error) {
    if (isPublicSiteMigrationMissing(settingsResult.error.message)) {
      return fallback;
    }
    throw new Error(settingsResult.error.message);
  }

  if (!settingsResult.data) {
    return fallback;
  }

  if (sectionsResult.error) {
    if (isPublicSiteMigrationMissing(sectionsResult.error.message)) {
      return { ...fallback, ...mapPublicSiteSettingsRow(settingsResult.data) };
    }
    throw new Error(sectionsResult.error.message);
  }

  const settings = mapPublicSiteSettingsRow(settingsResult.data);
  const sections = (sectionsResult.data ?? []).map(mapPublicSiteSectionRow);
  const primaryContact = identity?.contact ?? {
    email: null,
    phone: null,
    whatsapp: null,
    telegram: null,
    facebook: null,
    instagram: null,
  };

  return finalizePublicSiteConfig(settings, sections, {
    displayName,
    checkInTime,
    checkOutTime,
    primaryContact,
    fallbackSections: fallback.sections,
    fallbackContactEmail: fallback.contact.email,
    stayOffers,
    place,
  });
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

export type PublicSiteAdminBundle = {
  config: PublicSiteConfig;
  primaryContact: PensionContact;
};

/** Config + pension contact for settings UI — parallel cached service boundary. */
export const getPublicSiteAdminBundle = cache(
  async (): Promise<PublicSiteAdminBundle> => {
    const [config, identity] = await Promise.all([
      loadPublicSiteConfig(),
      getPensionIdentity().catch(() => null),
    ]);

    return {
      config,
      primaryContact: identity?.contact ?? EMPTY_PENSION_CONTACT,
    };
  },
);

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
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
import { finalizePublicSiteConfig } from "@/domain/public-site/resolve-config";
import {
  isPublicSiteMigrationMissing,
  mapPublicSiteSectionRow,
  mapPublicSiteSettingsRow,
} from "./map";

async function loadDefaultCopy() {
  const t = await getTranslations("public.home");
  return {
    heroBadge: t("badge"),
    heroSubtitle: t("subtitle"),
    heroTagline: t("tagline"),
    ctaPrimary: t("ctaBook"),
    ctaSecondary: t("ctaHow"),
    introTitle: t("whyTitle"),
    introLead: t("whyLead"),
    benefitsTitle: t("whyTitle"),
    benefitsLead: t("whyLead"),
    benefit1Title: t("feature1Title"),
    benefit1Text: t("feature1Text"),
    benefit2Title: t("feature2Title"),
    benefit2Text: t("feature2Text"),
    benefit3Title: t("feature3Title"),
    benefit3Text: t("feature3Text"),
    stepsTitle: t("stepsTitle"),
    stepsLead: t("stepsLead"),
    step1Title: t("step1Title"),
    step1Text: t("step1Text"),
    step2Title: t("step2Title"),
    step2Text: t("step2Text"),
    step3Title: t("step3Title"),
    step3Text: t("step3Text"),
    ctaBandTitle: t("ctaBandTitle"),
    ctaBandText: t("ctaBandText"),
    ctaBandButton: t("ctaBandButton"),
  };
}

async function getPublicSiteConfigUncached(
  tenantId: string
): Promise<PublicSiteConfig> {
  const [pension, identity, copy, tFooter] = await Promise.all([
    getPensionSettings().catch(() => null),
    getPensionIdentity().catch(() => null),
    loadDefaultCopy(),
    getTranslations("public.footer"),
  ]);

  const displayName = identity?.displayName ?? pension?.display_name ?? "Casa Emil";
  const checkInTime = pension?.default_check_in_time ?? "14:00";
  const checkOutTime = pension?.default_check_out_time ?? "11:00";
  const fallback = buildDefaultPublicSiteConfig({
    displayName,
    checkInTime,
    checkOutTime,
    copy,
    contactEmail: tFooter("contactEmail"),
  });

  const supabase = createPublicAdminClient();

  const [settingsResult, sectionsResult] = await Promise.all([
    supabase
      .from("public_site_settings")
      .select(
        "id, template_id, theme_id, published, booking_enabled, booking_nav_position, use_primary_contact, hero, contact, seo"
      )
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("public_site_sections")
      .select("id, section_type, sort_order, visible, payload")
      .eq("tenant_id", tenantId)
      .order("sort_order", { ascending: true }),
  ]);

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
  });
}

const getCachedPublicSiteConfig = (tenantId: string) =>
  unstable_cache(
    () => getPublicSiteConfigUncached(tenantId),
    ["public-site-config", tenantId],
    {
      tags: [CACHE_TAGS.publicSite, tenantTag(tenantId, CACHE_TAGS.publicSite)],
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

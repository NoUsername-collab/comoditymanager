import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { getPensionSettings } from "@/services/pension-settings";
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
  const [pension, copy, tFooter] = await Promise.all([
    getPensionSettings().catch(() => null),
    loadDefaultCopy(),
    getTranslations("public.footer"),
  ]);

  const displayName = pension?.display_name ?? "Casa Emil";
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

  const settingsResult = await supabase
    .from("public_site_settings")
    .select(
      "id, template_id, theme_id, published, booking_enabled, booking_nav_position, hero, contact, seo"
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (settingsResult.error) {
    if (isPublicSiteMigrationMissing(settingsResult.error.message)) {
      return fallback;
    }
    throw new Error(settingsResult.error.message);
  }

  if (!settingsResult.data) {
    return fallback;
  }

  const sectionsResult = await supabase
    .from("public_site_sections")
    .select("id, section_type, sort_order, visible, payload")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (sectionsResult.error) {
    if (isPublicSiteMigrationMissing(sectionsResult.error.message)) {
      return { ...fallback, ...mapPublicSiteSettingsRow(settingsResult.data) };
    }
    throw new Error(sectionsResult.error.message);
  }

  const settings = mapPublicSiteSettingsRow(settingsResult.data);
  const sections = (sectionsResult.data ?? []).map(mapPublicSiteSectionRow);

  return {
    ...settings,
    displayName,
    checkInTime,
    checkOutTime,
    sections: sections.length > 0 ? sections : fallback.sections,
    contact: {
      email: settings.contact.email ?? fallback.contact.email ?? null,
      phone: settings.contact.phone ?? null,
      whatsapp: settings.contact.whatsapp ?? null,
      telegram: settings.contact.telegram ?? null,
      facebook: settings.contact.facebook ?? null,
      instagram: settings.contact.instagram ?? null,
    },
  };
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

export async function getPublicSiteConfigForAdmin(): Promise<PublicSiteConfig> {
  const tenantId = await resolveTenantIdForData();
  return getPublicSiteConfigUncached(tenantId);
}

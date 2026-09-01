import type { Metadata } from "next";
import { PublicStaffPreviewLazy } from "@/features/public-site/ui/PublicStaffPreviewLazy";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { PublicSitePage } from "@/features/public-site/templates/PublicSiteTemplates";
import {
  loadPublicHomePage,
  loadPublicSiteConfig,
} from "@/features/public-site/loaders";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);

  return {
    title: pickLocalized(config.seo.metaTitle, locale, [config.displayName]),
    description: pickLocalized(config.seo.metaDescription, locale),
  };
}

export default async function HomePage() {
  const [locale, { config, staffPreview }] = await Promise.all([
    getLocale(),
    loadPublicHomePage(),
  ]);

  return (
    <>
      <PublicSitePage config={config} locale={locale} />
      {staffPreview ? <PublicStaffPreviewLazy data={staffPreview} /> : null}
    </>
  );
}

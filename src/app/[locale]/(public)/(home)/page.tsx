import type { Metadata } from "next";
import { PublicStaffPreviewLazy } from "@/features/public-site/ui/PublicStaffPreviewLazy";
import { PublicUnpublishedPage } from "@/features/public-site/ui/PublicUnpublishedPage";
import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import { publicPageMetadata } from "@/features/public-site/page-metadata";
import { PublicSitePage } from "@/features/public-site/templates/PublicSitePage";
import {
  loadPublicHomePage,
  loadPublicSiteConfig,
} from "@/features/public-site/loaders";
import { getLocale } from "next-intl/server";
import { AreaMessages } from "@/i18n/AreaMessages";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);
  const title = storedTitle(config.seo.metaTitle, locale, config.displayName);
  const description = pickOwnLocalized(config.seo.metaDescription, locale);
  return publicPageMetadata(config, { title, description, path: "/" });
}

export default async function HomePage() {
  const [locale, { config, staffPreview }] = await Promise.all([
    getLocale(),
    loadPublicHomePage(),
  ]);

  if (!config.published && !staffPreview) {
    return <PublicUnpublishedPage config={config} locale={locale} />;
  }

  return (
    <>
      <PublicSitePage config={config} locale={locale} />
      {/* Staff only: the operator panel's texts come with it, never to guests. */}
      {staffPreview ? (
        <AreaMessages>
          <PublicStaffPreviewLazy data={staffPreview} />
        </AreaMessages>
      ) : null}
    </>
  );
}

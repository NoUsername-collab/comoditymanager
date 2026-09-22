import type { Metadata } from "next";
import { PublicStaffPreviewLazy } from "@/features/public-site/ui/PublicStaffPreviewLazy";
import { PublicUnpublishedPage } from "@/features/public-site/ui/PublicUnpublishedPage";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { PublicSitePage } from "@/features/public-site/templates/PublicSitePage";
import {
  loadPublicHomePage,
  loadPublicSiteConfig,
} from "@/features/public-site/loaders";
import { getLocale } from "next-intl/server";

function ogImage(url: string | null | undefined) {
  return url ? [{ url }] : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);
  const title = pickLocalized(config.seo.metaTitle, locale, [config.displayName]);
  const description = pickLocalized(config.seo.metaDescription, locale);
  const image = config.pages.ogImageUrl || config.hero.imageUrl || null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage(image),
    },
  };
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
      {staffPreview ? <PublicStaffPreviewLazy data={staffPreview} /> : null}
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { publicNotFoundMetadata, publicPageMetadata } from "@/features/public-site/page-metadata";
import { PublicOwnPageBody } from "@/features/public-site/templates/PublicOwnPage";
import { PublicUnpublishedPage } from "@/features/public-site/ui/PublicUnpublishedPage";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";

type Params = Promise<{ slug: string }>;

async function findPage(slug: string) {
  const config = await loadPublicSiteConfig();
  return { config, page: config.sitePages.find((row) => row.slug === slug) ?? null };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { config, page } = await findPage(slug);
  if (!page) return publicNotFoundMetadata(config);
  const title = pickOwnLocalized(page.title, locale) || config.displayName;
  const description = pickOwnLocalized(page.seoDescription, locale) || pickOwnLocalized(page.lead, locale);
  return {
    ...(await publicPageMetadata(config, { title, description, path: `/${page.slug}` })),
    // A page the operator hid stays out of search results while staff look at it.
    ...(page.visible ? {} : { robots: { index: false, follow: false } }),
  };
}

/** One of the site's own pages, at /<slug>. Hidden pages are seen only by staff. */
export default async function OwnPage({ params }: { params: Params }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const { config, page } = await findPage(slug);
  if (!page) notFound();

  const staff = !page.visible || !config.published ? await getAdminUser().catch(() => null) : null;
  if (!page.visible && !staff) notFound();
  if (!config.published && !staff) return <PublicUnpublishedPage config={config} locale={locale} />;

  return <PublicOwnPageBody config={config} page={page} locale={locale} />;
}

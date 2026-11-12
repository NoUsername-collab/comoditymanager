import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { publicPageAlternates, titleWithName } from "@/features/public-site/domain/seo";
import { requestOrigin } from "@/lib/tenant/site-url";

/**
 * Metadata for a public page: its own title with the property's name, the
 * same name as the site's name in shared links, the site's share image, and
 * its address on this site's host with the same page in the other languages.
 */
export async function publicPageMetadata(
  config: Pick<PublicSiteConfig, "displayName" | "pages" | "hero">,
  page: { title: string; description?: string; path: string },
): Promise<Metadata> {
  const [origin, locale] = await Promise.all([requestOrigin(), getLocale()]);
  const title = titleWithName(page.title, config.displayName);
  const description = page.description || undefined;
  const image = config.pages.ogImageUrl || config.hero.imageUrl || null;
  const alternates = publicPageAlternates(origin, page.path, locale);
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: config.displayName.trim() || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

/** "This page does not exist · Casa Ana": the site's name, never the platform's. */
export async function publicNotFoundMetadata(
  config: Pick<PublicSiteConfig, "displayName">,
): Promise<Metadata> {
  const t = await getTranslations("public.notFound");
  return {
    title: titleWithName(t("title"), config.displayName),
    robots: { index: false, follow: false },
  };
}

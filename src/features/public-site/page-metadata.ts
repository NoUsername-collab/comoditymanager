import type { Metadata } from "next";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { titleWithName } from "@/features/public-site/domain/seo";

/**
 * Metadata for a public page: its own title with the property's name, the
 * same name as the site's name in shared links, and the site's share image.
 */
export function publicPageMetadata(
  config: Pick<PublicSiteConfig, "displayName" | "pages" | "hero">,
  page: { title: string; description?: string },
): Metadata {
  const title = titleWithName(page.title, config.displayName);
  const description = page.description || undefined;
  const image = config.pages.ogImageUrl || config.hero.imageUrl || null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: config.displayName.trim() || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

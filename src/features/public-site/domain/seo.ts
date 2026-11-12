import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { PUBLIC_LOCALES, type PublicSiteConfig } from "@/features/public-site/domain/types";

/** Shapes of Next's MetadataRoute.Robots / Sitemap, kept here so domain code needs no framework import. */
export type PublicRobots = {
  rules: { userAgent: string; allow?: string; disallow?: string | string[] };
  sitemap?: string;
};
export type PublicSitemapEntry = {
  url: string;
  changeFrequency: "daily" | "weekly";
  priority: number;
  alternates: { languages: Record<string, string> };
};

/** Pages a search engine has no business indexing on a guesthouse site. */
const PRIVATE_PATHS = ["/admin", "/api", "/receptie", "/calendar/confirm"];

/** Default locale has no prefix ("as-needed" routing). */
function localizedUrl(baseUrl: string, path: string, locale: string): string {
  const prefix = locale === "ro" ? "" : `/${locale}`;
  const tail = path === "/" ? (prefix ? "" : "/") : path;
  return `${baseUrl}${prefix}${tail}`;
}

function hasCopy(value: Parameters<typeof pickOwnLocalized>[0]): boolean {
  return PUBLIC_LOCALES.some((locale) => pickOwnLocalized(value, locale).length > 0);
}

/** robots.txt for a guesthouse site; an unpublished one asks not to be crawled. */
export function publicSiteRobots(config: PublicSiteConfig, baseUrl: string): PublicRobots {
  if (!config.published) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

/** Every public page in every language, each listing its translations. */
export function publicSiteSitemap(config: PublicSiteConfig, baseUrl: string): PublicSitemapEntry[] {
  if (!config.published) return [];

  const paths = ["/"];
  if (config.bookingEnabled) paths.push("/calendar");
  if (hasCopy(config.pages.privacyBody)) paths.push("/confidentialitate");
  if (hasCopy(config.pages.termsTitle) || hasCopy(config.pages.termsBody)) {
    paths.push("/termeni");
  }
  // The site's own pages that are shown.
  for (const page of config.sitePages ?? []) {
    if (page.visible) paths.push(`/${page.slug}`);
  }

  return paths.flatMap((path) => {
    const languages = Object.fromEntries(
      PUBLIC_LOCALES.map((locale) => [locale, localizedUrl(baseUrl, path, locale)]),
    );
    return PUBLIC_LOCALES.map((locale) => ({
      url: localizedUrl(baseUrl, path, locale),
      changeFrequency: path === "/calendar" ? ("daily" as const) : ("weekly" as const),
      priority: path === "/" ? 1 : path === "/calendar" ? 0.8 : 0.3,
      alternates: { languages },
    }));
  });
}

/**
 * A page title that carries the property's name, so search results and shared
 * links show one name for the place: "Rooms · Casa Ana", or the title alone
 * when it already names the property.
 */
export function titleWithName(title: string, propertyName: string): string {
  const name = propertyName.trim();
  const own = title.trim();
  if (!own) return name;
  if (!name || own.toLocaleLowerCase().includes(name.toLocaleLowerCase())) return own;
  return `${own} · ${name}`;
}

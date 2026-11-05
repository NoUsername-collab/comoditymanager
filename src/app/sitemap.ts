import type { MetadataRoute } from "next";
import { publicSiteSitemap } from "@/features/public-site/domain/seo";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { requestOrigin } from "@/lib/tenant/site-url";

/** The guesthouse site on this host; the platform host has none. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!(await resolveRequestTenant())) return [];
  return publicSiteSitemap(await getPublicSiteConfig(), await requestOrigin());
}

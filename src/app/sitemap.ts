import type { MetadataRoute } from "next";
import { platformSitemap, publicSiteSitemap } from "@/features/public-site/domain/seo";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { requestOrigin } from "@/lib/tenant/site-url";

/** The guesthouse site on this host, or the platform's own pages on the platform host. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await requestOrigin();
  if (!(await resolveRequestTenant())) return platformSitemap(origin);
  return publicSiteSitemap(await getPublicSiteConfig(), origin);
}

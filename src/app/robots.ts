import type { MetadataRoute } from "next";
import { publicSiteRobots } from "@/features/public-site/domain/seo";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { requestOrigin } from "@/lib/tenant/site-url";

/** Per host: a guesthouse site lists its own pages; the platform keeps staff areas out. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await requestOrigin();
  if (!(await resolveRequestTenant())) {
    return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] } };
  }
  return publicSiteRobots(await getPublicSiteConfig(), origin);
}

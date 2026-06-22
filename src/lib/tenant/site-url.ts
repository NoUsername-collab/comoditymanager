import { headers } from "next/headers";
import { getActiveTenantSlug } from "@/lib/tenant/active";
import { buildTenantSiteUrl, tenantSlugFromHost } from "@/lib/tenant/host";
import { platformSiteUrl } from "@/lib/platform/branding";

/**
 * Base URL for tenant-scoped public pages (guest app, public calendar).
 * Must use the tenant subdomain — never the platform apex (test.nestio.ro).
 */
export async function resolveTenantPublicSiteUrl(
  requestHost?: string | null,
): Promise<string> {
  const headerStore = await headers();
  const host =
    requestHost ??
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    null;

  const slug =
    headerStore.get("x-tenant-slug")?.trim() ||
    tenantSlugFromHost(host ?? "") ||
    (await getActiveTenantSlug());

  if (slug) {
    return buildTenantSiteUrl(slug, host);
  }

  return platformSiteUrl(host);
}

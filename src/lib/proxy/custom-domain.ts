import { NextResponse, type NextRequest } from "next/server";
import { buildTenantAdminUrl, defaultPlatformApexHost } from "@/lib/tenant/host";
import { isStaffOnlyPath, pathAllowedOnCustomDomain } from "@/lib/tenant/domain-routing";
import { resolveDomainRoutingOnEdge } from "@/lib/tenant/domain-routing-edge";
import { lookupTenantHostOnEdge } from "@/lib/tenant/tenant-host-edge";
import { isTenantOperational } from "@/domain/tenant/operational";
import { requestHostFrom } from "@/lib/proxy/request-context";
import { tenantSuspendedRedirect } from "@/lib/proxy/tenant-status";
import { runTenantAppProxy } from "@/lib/proxy/tenant-app";

/** Unknown or unverified domain: suspended notice if it belonged to a blocked tenant, else the landing page. */
async function unknownDomainRedirect(
  request: NextRequest,
  domain: string,
  path: string
): Promise<NextResponse> {
  const blocked = await lookupTenantHostOnEdge({ customDomain: domain });
  if (blocked && !isTenantOperational(blocked.status)) {
    const suspended = tenantSuspendedRedirect(request, path, blocked.status);
    if (suspended) return suspended;
  }

  const url = request.nextUrl.clone();
  if (process.env.NODE_ENV === "production") {
    url.protocol = "https:";
  }
  url.hostname = defaultPlatformApexHost();
  url.pathname = "/landing";
  url.search = "";
  return NextResponse.redirect(url, 302);
}

/** A tenant's own domain: pages its routing kind does not serve go to the tenant subdomain. */
export async function customDomainProxy(
  request: NextRequest,
  domain: string,
  path: string
): Promise<NextResponse> {
  const resolved = await resolveDomainRoutingOnEdge(domain);
  if (!resolved) return unknownDomainRedirect(request, domain, path);

  const { slug, routingKind } = resolved;

  if (!pathAllowedOnCustomDomain(path, routingKind)) {
    const requestHost = requestHostFrom(request);
    if (isStaffOnlyPath(path) || path.startsWith("/admin")) {
      const safe = path.startsWith("/admin") ? path : "/admin";
      return NextResponse.redirect(buildTenantAdminUrl(slug, safe, requestHost));
    }
    if (routingKind === "custom_brand" && path.startsWith("/calendar")) {
      return NextResponse.redirect(buildTenantAdminUrl(slug, "/calendar", requestHost));
    }
    return NextResponse.redirect(buildTenantAdminUrl(slug, "/", requestHost));
  }

  return runTenantAppProxy(request, slug, domain, routingKind);
}

import { NextResponse, NextRequest } from "next/server";
import { stagingTenantHostCorrection } from "@/lib/tenant/host";
import { routing } from "./i18n/routing";
import { detectDomainContext, stripLocalePrefix } from "@/lib/proxy/request-context";
import { alphaGateRedirectIfNeeded } from "@/lib/proxy/alpha-gate";
import { platformProxy } from "@/lib/proxy/platform";
import { customDomainProxy } from "@/lib/proxy/custom-domain";
import { runTenantAppProxy } from "@/lib/proxy/tenant-app";

/**
 * Routes every page request by host:
 * - platform (zalmox.app / test.zalmox.app) → src/lib/proxy/platform.ts
 * - a tenant's own domain → src/lib/proxy/custom-domain.ts
 * - slug.zalmox.app → src/lib/proxy/tenant-app.ts
 */
export async function proxy(request: NextRequest) {
  // API routes must not pass through next-intl (would rewrite /api → /en/api → 404)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const correctedHost = stagingTenantHostCorrection(
    request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      ""
  );
  if (correctedHost) {
    const url = request.nextUrl.clone();
    url.hostname = correctedHost;
    return NextResponse.redirect(url, 308);
  }

  const domain = detectDomainContext(request);
  const path = stripLocalePrefix(request.nextUrl.pathname, routing.locales);

  const alphaRedirect = alphaGateRedirectIfNeeded(request, path);
  if (alphaRedirect) return alphaRedirect;

  if (domain.type === "platform") return platformProxy(request, path);
  if (domain.type === "custom") return customDomainProxy(request, domain.domain, path);

  const slug = domain.type === "tenant" ? domain.slug : undefined;
  return runTenantAppProxy(request, slug, undefined, "platform_subdomain");
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|api|.*\\..*).*)",
    "/admin/:path*",
    "/receptie",
    "/calendar/confirm/:path*",
  ],
};

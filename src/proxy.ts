import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";
import {
  ALPHA_GATE_COOKIE,
  isAlphaGateCookieFresh,
} from "@/lib/auth/alpha-gate-cookie";
import {
  isAlphaGateEnabled,
  isAlphaGateExemptPath,
} from "@/lib/auth/alpha-gate-edge";
import {
  ADMIN_LOCATION_UNLOCK_COOKIE,
  isAdminLocationUnlockCookieFresh,
} from "@/lib/auth/admin-location-unlock-cookie";
import { pathBlockedForOperator } from "@/lib/auth/roles";
import { resolveStaffRoleOnTenantHost } from "@/lib/auth/tenant-staff-edge";
import { getEdgeSupabaseConfig } from "@/lib/env/edge";
import { buildTenantAdminUrl, parseTenantFromHost } from "@/lib/tenant/host";
import {
  isValidTenantSlug,
  TENANT_SLUG_COOKIE,
  tenantSlugFromPlatformRequest,
  usesPlatformTenantRouting,
} from "@/lib/tenant/routing";
import { getPrimaryTenantSlugForUser } from "@/services/tenant-members";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// ─── Domain detection ──────────────────────────────────────────────

type DomainContext =
  | { type: "platform" }
  | { type: "tenant"; slug: string }
  | { type: "custom"; domain: string };

function detectDomain(request: NextRequest): DomainContext {
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  if (host === "localhost" || host === "127.0.0.1") {
    const devSlug = request.headers.get("x-tenant-slug");
    if (devSlug) return { type: "tenant", slug: devSlug };
    return { type: "platform" };
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length);
    if (slug && !slug.includes(".")) return { type: "tenant", slug };
  }

  const parsed = parseTenantFromHost(host);
  if (parsed.type === "platform") return { type: "platform" };
  if (parsed.type === "tenant") return { type: "tenant", slug: parsed.slug };
  return { type: "custom", domain: parsed.domain };
}

// ─── Platform routes (hospira.ro) ──────────────────────────────────

const PLATFORM_ROUTES = new Set([
  "/",
  "/landing",
  "/signup",
  "/login",
  "/preturi",
  "/confidentialitate",
  "/termeni",
]);

function isPlatformRoute(path: string): boolean {
  return PLATFORM_ROUTES.has(path) || path.startsWith("/api/");
}

// ─── Helpers ───────────────────────────────────────────────────────

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return `/${segments.slice(1).join("/")}` || "/";
  }
  return pathname;
}

function isLocationAdminPath(path: string): boolean {
  return (
    path === "/admin/settings/location" ||
    path.startsWith("/admin/settings/location/")
  );
}

function alphaGateRedirectIfNeeded(
  request: NextRequest,
  path: string
): NextResponse | null {
  if (!isAlphaGateEnabled() || isAlphaGateExemptPath(path)) return null;

  const token = request.cookies.get(ALPHA_GATE_COOKIE)?.value;
  if (isAlphaGateCookieFresh(token)) return null;

  const url = request.nextUrl.clone();
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0];
  const hasLocale =
    Boolean(first) &&
    routing.locales.includes(first as (typeof routing.locales)[number]);
  const localePrefix = hasLocale ? `/${first}` : "";
  const returnTo =
    request.nextUrl.pathname +
    (request.nextUrl.search ? request.nextUrl.search : "");

  url.pathname = `${localePrefix}/alpha-gate`;
  url.search = "";
  url.searchParams.set("next", returnTo);
  return NextResponse.redirect(url);
}

async function resolveEffectiveStaffRole(
  userId: string,
  _email: string | undefined,
  slug: string | undefined,
  customDomain: string | undefined,
  sessionClient?: SupabaseClient
): Promise<"admin" | "operator" | null> {
  if (slug) {
    return resolveStaffRoleOnTenantHost(userId, { slug }, sessionClient);
  }
  if (customDomain) {
    return resolveStaffRoleOnTenantHost(
      userId,
      { customDomain },
      sessionClient
    );
  }
  return null;
}

function requestHostFrom(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

function isTenantAppPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/calendar") ||
    path.startsWith("/receptie")
  );
}

function setTenantSlugCookie(response: NextResponse, slug: string): void {
  response.cookies.set(TENANT_SLUG_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}

async function runTenantAppProxy(
  request: NextRequest,
  slug: string | undefined,
  customDomain: string | undefined
): Promise<NextResponse> {
  const path = stripLocalePrefix(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (customDomain) requestHeaders.set("x-tenant-domain", customDomain);

  const tenantRequest = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  if (path === "/landing" || path === "/signup" || path === "/preturi") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(tenantRequest);
  const tenantParam = request.nextUrl.searchParams.get("tenant");
  if (isValidTenantSlug(tenantParam)) {
    setTenantSlugCookie(intlResponse, tenantParam);
  } else if (isValidTenantSlug(slug)) {
    setTenantSlugCookie(intlResponse, slug);
  }

  const { configured, url, key } = getEdgeSupabaseConfig();
  if (!configured || !url || !key) {
    return intlResponse;
  }

  let supabaseResponse = intlResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return tenantRequest.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          tenantRequest.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = path === "/admin/login";
  const staffOnly =
    path === "/receptie" || path.startsWith("/calendar/confirm/");

  if (
    (path.startsWith("/admin") && !isLoginPage && !user) ||
    (staffOnly && !user)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", path);
    if (isValidTenantSlug(slug)) {
      redirectUrl.searchParams.set("tenant", slug);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (user && ((path.startsWith("/admin") && !isLoginPage) || staffOnly)) {
    const effectiveRole = await resolveEffectiveStaffRole(
      user.id,
      user.email,
      slug,
      customDomain,
      supabase
    );

    if (!effectiveRole) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("error", "unauthorized");
      if (isValidTenantSlug(slug)) {
        redirectUrl.searchParams.set("tenant", slug);
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (
      path.startsWith("/admin") &&
      !isLoginPage &&
      (isLocationAdminPath(path) || pathBlockedForOperator(path))
    ) {
      const unlock = request.cookies.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value;
      if (!isAdminLocationUnlockCookieFresh(unlock)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/settings";
        redirectUrl.searchParams.set("location", "locked");
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  if (isLoginPage && user) {
    let effectiveSlug = slug;
    if (!effectiveSlug) {
      effectiveSlug =
        (await getPrimaryTenantSlugForUser(supabase, user.id)) ?? undefined;
    }

    if (effectiveSlug || customDomain) {
      const effectiveRole = await resolveEffectiveStaffRole(
        user.id,
        user.email,
        effectiveSlug,
        customDomain,
        supabase
      );
      if (!effectiveRole) {
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    const next =
      request.nextUrl.searchParams.get("next") ||
      (usesPlatformTenantRouting(requestHostFrom(request))
        ? "/admin"
        : "/receptie");
    const safe =
      next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
        ? next
        : usesPlatformTenantRouting(requestHostFrom(request))
          ? "/admin"
          : "/receptie";

    if (effectiveSlug) {
      return NextResponse.redirect(
        buildTenantAdminUrl(effectiveSlug, safe, requestHostFrom(request))
      );
    }

    return NextResponse.redirect(new URL(safe, request.url));
  }

  if (slug) {
    supabaseResponse.headers.set("x-tenant-slug", slug);
  }
  if (customDomain) {
    supabaseResponse.headers.set("x-tenant-domain", customDomain);
  }

  return supabaseResponse;
}

// ─── Main proxy ────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const domain = detectDomain(request);
  const path = stripLocalePrefix(request.nextUrl.pathname);

  const alphaRedirect = alphaGateRedirectIfNeeded(request, path);
  if (alphaRedirect) return alphaRedirect;

  // ── PLATFORM (hospira.ro) ────────────────────────────────────
  if (domain.type === "platform") {
    const requestHost = requestHostFrom(request);
    const platformRouting = usesPlatformTenantRouting(requestHost);

    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.redirect(url);
    }

    // Staging: admin on test.hospira.ro (no wildcard subdomain SSL needed)
    if (platformRouting && isTenantAppPath(path)) {
      const slug = tenantSlugFromPlatformRequest(request);
      if (!slug && path !== "/admin/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
      }
      return runTenantAppProxy(request, slug, undefined);
    }

    if (
      (path.startsWith("/admin") && path !== "/admin/login") ||
      path.startsWith("/calendar") ||
      path.startsWith("/receptie")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }

    if (path === "/admin/login") {
      const { configured, url, key } = getEdgeSupabaseConfig();
      if (configured && url && key) {
        let loginResponse = intlMiddleware(request);
        const supabase = createServerClient(url, key, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              cookiesToSet.forEach(({ name, value, options }) =>
                loginResponse.cookies.set(name, value, options)
              );
            },
          },
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const slug = await getPrimaryTenantSlugForUser(supabase, user.id);
          if (slug) {
            const next = request.nextUrl.searchParams.get("next") || "/admin";
            const safe =
              next.startsWith("/") &&
              !next.startsWith("//") &&
              !next.includes("://")
                ? next
                : "/admin";
            return NextResponse.redirect(
              buildTenantAdminUrl(slug, safe, requestHost)
            );
          }
        }

        return loginResponse;
      }
    }

    return intlMiddleware(request);
  }

  // ── TENANT (slug.hospira.ro or custom domain) ────────────────
  const slug = domain.type === "tenant" ? domain.slug : undefined;
  const customDomain = domain.type === "custom" ? domain.domain : undefined;
  return runTenantAppProxy(request, slug, customDomain);
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
    "/receptie",
    "/calendar/confirm/:path*",
  ],
};

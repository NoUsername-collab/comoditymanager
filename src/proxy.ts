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

// ─── Main proxy ────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const domain = detectDomain(request);
  const path = stripLocalePrefix(request.nextUrl.pathname);

  const alphaRedirect = alphaGateRedirectIfNeeded(request, path);
  if (alphaRedirect) return alphaRedirect;

  // ── PLATFORM (hospira.ro) ────────────────────────────────────
  if (domain.type === "platform") {
    // Root → redirect to landing (redirect, not rewrite — rewrite skips intl and 404s)
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.redirect(url);
    }

    // Block tenant-only routes on platform domain (login stays reachable)
    if (
      (path.startsWith("/admin") && path !== "/admin/login") ||
      path.startsWith("/calendar") ||
      path.startsWith("/receptie")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }

    // Platform login: already authenticated → tenant subdomain admin
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
              buildTenantAdminUrl(
                slug,
                safe,
                request.headers.get("x-forwarded-host") ??
                  request.headers.get("host")
              )
            );
          }
        }

        return loginResponse;
      }
    }

    // Allow platform routes normally
    return intlMiddleware(request);
  }

  // ── TENANT (slug.hospira.ro or custom domain) ────────────────
  const slug = domain.type === "tenant" ? domain.slug : undefined;
  const customDomain = domain.type === "custom" ? domain.domain : undefined;

  const requestHeaders = new Headers(request.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (customDomain) requestHeaders.set("x-tenant-domain", customDomain);

  const tenantRequest = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  // Block platform-only routes on tenant domains
  if (path === "/landing" || path === "/signup" || path === "/preturi") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const intlResponse = intlMiddleware(tenantRequest);

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
    const effectiveRole = await resolveEffectiveStaffRole(
      user.id,
      user.email,
      slug,
      customDomain,
      supabase
    );
    if (slug || customDomain) {
      if (!effectiveRole) {
        await supabase.auth.signOut();
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    const next = request.nextUrl.searchParams.get("next") || "/receptie";
    const safe =
      next.startsWith("/") && !next.startsWith("//") && !next.includes("://")
        ? next
        : "/receptie";
    return NextResponse.redirect(new URL(safe, request.url));
  }

  // Propagate tenant headers to response
  if (slug) {
    supabaseResponse.headers.set("x-tenant-slug", slug);
  }
  if (customDomain) {
    supabaseResponse.headers.set("x-tenant-domain", customDomain);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
    "/receptie",
    "/calendar/confirm/:path*",
  ],
};

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
import { resolveStaffRoleOnTenantHost, resolveTenantMemberRoleOnTenantHost } from "@/lib/auth/tenant-staff-edge";
import { isPlatformAdminEmailEdge } from "@/lib/auth/require-platform-admin";
import { getEdgeSupabaseConfig } from "@/lib/env/edge";
import { buildTenantAdminUrl, parseTenantFromHost, stagingTenantHostCorrection } from "@/lib/tenant/host";
import {
  isStaffOnlyPath,
  pathAllowedOnCustomDomain,
  type TenantDomainRoutingKind,
} from "@/lib/tenant/domain-routing";
import { resolveDomainRoutingOnEdge } from "@/lib/tenant/domain-routing-edge";
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

async function runTenantAppProxy(
  request: NextRequest,
  slug: string | undefined,
  customDomain: string | undefined,
  routingKind: TenantDomainRoutingKind = "hospira_subdomain"
): Promise<NextResponse> {
  const path = stripLocalePrefix(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (customDomain) requestHeaders.set("x-tenant-domain", customDomain);
  requestHeaders.set("x-tenant-domain-kind", routingKind);

  const tenantRequest = new NextRequest(request.url, {
    headers: requestHeaders,
  });

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
      const memberRole =
        slug != null
          ? await resolveTenantMemberRoleOnTenantHost(
              user.id,
              { slug },
              supabase
            )
          : customDomain != null
            ? await resolveTenantMemberRoleOnTenantHost(
                user.id,
                { customDomain },
                supabase
              )
            : null;

      if (memberRole !== "owner") {
        const unlock = request.cookies.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value;
        if (!isAdminLocationUnlockCookieFresh(unlock)) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/admin/settings";
          redirectUrl.searchParams.set("location", "locked");
          return NextResponse.redirect(redirectUrl);
        }
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

  if (slug) {
    supabaseResponse.headers.set("x-tenant-slug", slug);
  }
  if (customDomain) {
    supabaseResponse.headers.set("x-tenant-domain", customDomain);
  }

  return supabaseResponse;
}

async function redirectPlatformUserToTenantAdmin(
  request: NextRequest,
  requestHost: string | null,
  path: string,
): Promise<NextResponse | null> {
  const { configured, url, key } = getEdgeSupabaseConfig();
  if (!configured || !url || !key) return null;

  let response = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const slug = await getPrimaryTenantSlugForUser(
    supabase,
    user.id,
    user.email
  );
  if (!slug) return null;

  const safe =
    path.startsWith("/") && !path.startsWith("//") && !path.includes("://")
      ? path
      : "/admin";
  return NextResponse.redirect(buildTenantAdminUrl(slug, safe, requestHost));
}

// ─── Main proxy ────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
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

  const domain = detectDomain(request);
  const path = stripLocalePrefix(request.nextUrl.pathname);

  const alphaRedirect = alphaGateRedirectIfNeeded(request, path);
  if (alphaRedirect) return alphaRedirect;

  // ── PLATFORM (hospira.ro / test.hospira.ro) ──────────────────
  if (domain.type === "platform") {
    const requestHost = requestHostFrom(request);

    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.redirect(url);
    }

    // Hospira internal admin — platform domain only, email-gated
    if (path.startsWith("/hospira-admin")) {
      const { configured, url, key } = getEdgeSupabaseConfig();
      if (!configured || !url || !key) {
        const noAuth = request.nextUrl.clone();
        noAuth.pathname = "/landing";
        return NextResponse.redirect(noAuth);
      }

      let haResponse = intlMiddleware(request);
      const haSupa = createServerClient(url, key, {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            cookiesToSet.forEach(({ name, value, options }) => haResponse.cookies.set(name, value, options));
          },
        },
      });
      const { data: { user: haUser } } = await haSupa.auth.getUser();

      // Not authenticated → send to login, come back after
      if (!haUser) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/admin/login";
        loginUrl.searchParams.set("next", path);
        return NextResponse.redirect(loginUrl);
      }

      // Authenticated but not platform admin → deny
      if (!isPlatformAdminEmailEdge(haUser.email)) {
        const deny = request.nextUrl.clone();
        deny.pathname = "/landing";
        return NextResponse.redirect(deny);
      }

      return haResponse;
    }

    // Admin lives on tenant subdomains — send guests to login, owners to subdomain
    if (
      (path.startsWith("/admin") && path !== "/admin/login") ||
      path.startsWith("/calendar") ||
      path.startsWith("/receptie")
    ) {
      const tenantRedirect = await redirectPlatformUserToTenantAdmin(
        request,
        requestHost,
        path.startsWith("/admin") ? path : "/admin",
      );
      if (tenantRedirect) return tenantRedirect;

      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      if (path !== "/admin") url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    // Platform login → redirect authenticated owners to tenant subdomain
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
          const next = request.nextUrl.searchParams.get("next") || "/admin";
          const safe =
            next.startsWith("/") &&
            !next.startsWith("//") &&
            !next.includes("://")
              ? next
              : "/admin";

          // Platform admin routes stay on platform domain
          if (safe.startsWith("/hospira-admin")) {
            return NextResponse.redirect(new URL(safe, request.url));
          }

          const slug = await getPrimaryTenantSlugForUser(
            supabase,
            user.id,
            user.email
          );
          if (slug) {
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
  const requestHost = requestHostFrom(request);

  if (domain.type === "custom") {
    const resolved = await resolveDomainRoutingOnEdge(domain.domain);
    if (!resolved) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }

    const path = stripLocalePrefix(request.nextUrl.pathname);
    const slug = resolved.slug;
    const routingKind = resolved.routingKind;

    if (!pathAllowedOnCustomDomain(path, routingKind)) {
      if (isStaffOnlyPath(path) || path.startsWith("/admin")) {
        const safe = path.startsWith("/admin") ? path : "/admin";
        return NextResponse.redirect(
          buildTenantAdminUrl(slug, safe, requestHost)
        );
      }
      if (routingKind === "custom_brand" && path.startsWith("/calendar")) {
        return NextResponse.redirect(
          buildTenantAdminUrl(slug, "/calendar", requestHost)
        );
      }
      return NextResponse.redirect(buildTenantAdminUrl(slug, "/", requestHost));
    }

    return runTenantAppProxy(request, slug, domain.domain, routingKind);
  }

  const slug = domain.type === "tenant" ? domain.slug : undefined;
  return runTenantAppProxy(request, slug, undefined, "hospira_subdomain");
}

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/admin/:path*",
    "/receptie",
    "/calendar/confirm/:path*",
  ],
};

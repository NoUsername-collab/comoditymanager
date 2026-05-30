import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LOCATION_UNLOCK_COOKIE,
  isAdminLocationUnlockCookieFresh,
} from "@/lib/auth/admin-location-unlock-cookie";
import { pathBlockedForOperator } from "@/lib/auth/roles";
import { getEdgeStaffEmails, getEdgeSupabaseConfig } from "@/lib/env/edge";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// ─── Domain detection ──────────────────────────────────────────────

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "hospira.ro";

type DomainContext =
  | { type: "platform" }        // hospira.ro — landing, signup, pricing
  | { type: "tenant"; slug: string }  // casa-emil.hospira.ro — app per client
  | { type: "custom"; domain: string }; // custom domain — resolved from DB

function detectDomain(request: NextRequest): DomainContext {
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  // localhost — treat as platform in dev
  if (host === "localhost" || host === "127.0.0.1") {
    // Check if there's a x-tenant-slug header (for local dev testing)
    const devSlug = request.headers.get("x-tenant-slug");
    if (devSlug) return { type: "tenant", slug: devSlug };
    return { type: "platform" };
  }

  // Exact match: hospira.ro or www.hospira.ro → platform
  if (host === PLATFORM_DOMAIN || host === `www.${PLATFORM_DOMAIN}`) {
    return { type: "platform" };
  }

  // Subdomain: slug.hospira.ro → tenant
  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = host.replace(`.${PLATFORM_DOMAIN}`, "");
    if (slug && !slug.includes(".")) {
      return { type: "tenant", slug };
    }
  }

  // Vercel preview deployments
  if (host.endsWith(".vercel.app")) {
    return { type: "platform" };
  }

  // Custom domain → resolve later from DB
  return { type: "custom", domain: host };
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

function staffRoleFromEmail(
  email: string | undefined
): "admin" | "operator" | null {
  if (!email) return null;
  const e = email.toLowerCase();
  const { adminEmail, operatorEmail } = getEdgeStaffEmails();
  if (e === adminEmail) return "admin";
  if (e === operatorEmail) return "operator";
  // Check app_metadata role (for multi-tenant staff)
  return null;
}

// ─── Main proxy ────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const domain = detectDomain(request);
  const path = stripLocalePrefix(request.nextUrl.pathname);

  // ── PLATFORM (hospira.ro) ────────────────────────────────────
  if (domain.type === "platform") {
    // Root → redirect to landing
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/landing";
      return NextResponse.rewrite(url);
    }

    // Block tenant-only routes on platform domain
    if (
      path.startsWith("/admin") ||
      path.startsWith("/calendar") ||
      path.startsWith("/receptie")
    ) {
      // If someone tries hospira.ro/admin → redirect to login/signup
      const url = request.nextUrl.clone();
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }

    // Allow platform routes normally
    return intlMiddleware(request);
  }

  // ── TENANT (slug.hospira.ro or custom domain) ────────────────
  // Set tenant slug in headers for downstream resolution
  const slug =
    domain.type === "tenant" ? domain.slug : undefined;
  const customDomain =
    domain.type === "custom" ? domain.domain : undefined;

  // Add tenant context to request headers
  const requestHeaders = new Headers(request.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (customDomain) requestHeaders.set("x-tenant-domain", customDomain);

  // Block platform-only routes on tenant domains
  if (path === "/landing" || path === "/signup" || path === "/preturi") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Normal intl + auth flow for tenant
  const intlResponse = intlMiddleware(request);

  const { configured, url, key } = getEdgeSupabaseConfig();
  if (!configured || !url || !key) {
    return intlResponse;
  }

  let supabaseResponse = intlResponse;

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

  if (user && path.startsWith("/admin") && !isLoginPage) {
    const role = staffRoleFromEmail(user.email);
    // For multi-tenant: also check app_metadata
    const metaRole =
      user.app_metadata?.role as "admin" | "operator" | "owner" | undefined;
    const effectiveRole = role ?? (metaRole === "owner" ? "admin" : metaRole) ?? null;

    if (!effectiveRole) {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(redirectUrl);
    }

    if (isLocationAdminPath(path) || pathBlockedForOperator(path)) {
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

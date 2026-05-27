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

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && routing.locales.includes(first as (typeof routing.locales)[number])) {
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

function staffRoleFromEmail(email: string | undefined): "admin" | "operator" | null {
  if (!email) return null;
  const e = email.toLowerCase();
  const { adminEmail, operatorEmail } = getEdgeStaffEmails();
  if (e === adminEmail) return "admin";
  if (e === operatorEmail) return "operator";
  return null;
}

export async function proxy(request: NextRequest) {
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
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = stripLocalePrefix(request.nextUrl.pathname);
  const isLoginPage = path === "/admin/login";
  const staffOnly =
    path === "/receptie" || path.startsWith("/calendar/confirm/");

  if ((path.startsWith("/admin") && !isLoginPage && !user) || (staffOnly && !user)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path.startsWith("/admin") && !isLoginPage) {
    const role = staffRoleFromEmail(user.email);
    if (!role) {
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

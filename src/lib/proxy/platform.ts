import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/security/safe-path";
import { isMfaExemptAdminPath } from "@/lib/auth/mfa-policy";
import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import { isPlatformAdminEmailEdge } from "@/lib/auth/require-platform-admin";
import { buildTenantAdminUrl } from "@/lib/tenant/host";
import { getPrimaryTenantSlugForUser } from "@/services/tenant-members";
import { requestHostFrom } from "@/lib/proxy/request-context";
import { mfaRedirectIfNeeded } from "@/lib/proxy/staff-mfa";
import { createProxySupabase } from "@/lib/proxy/edge-session";
import { intlMiddleware } from "@/lib/proxy/intl";
import { redirectToPath } from "@/lib/proxy/redirect";

/** Zalmox internal admin: signed in, platform-admin email, MFA. */
async function platformAdminProxy(request: NextRequest, path: string): Promise<NextResponse> {
  const response = intlMiddleware(request);
  const supabase = createProxySupabase(request, response);
  if (!supabase) return redirectToPath(request, "/landing");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirectToPath(request, "/admin/login", { next: path });
  if (!isPlatformAdminEmailEdge(user.email)) return redirectToPath(request, "/landing");

  const mfaRedirect = await mfaRedirectIfNeeded(request, supabase, user, path, null);
  return mfaRedirect ?? response;
}

/** A signed-in owner on the platform is sent to the same page on their tenant subdomain. */
async function redirectPlatformUserToTenantAdmin(
  request: NextRequest,
  requestHost: string | null,
  path: string
): Promise<NextResponse | null> {
  const supabase = createProxySupabase(request, NextResponse.next());
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const slug = await getPrimaryTenantSlugForUser(supabase, user.id, user.email);
  if (!slug) return null;

  const safe = safeInternalPath(path, "/admin");
  return NextResponse.redirect(buildTenantAdminUrl(slug, safe, requestHost));
}

/** Platform login: a signed-in user goes through MFA, then to platform admin or their tenant. */
async function platformLoginProxy(
  request: NextRequest,
  requestHost: string | null
): Promise<NextResponse> {
  const response = intlMiddleware(request);
  const supabase = createProxySupabase(request, response);
  if (!supabase) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return response;

  const next = request.nextUrl.searchParams.get("next") || "/admin";
  const safe = safeInternalPath(next, "/admin");

  const mfaRedirectPath = await resolveMfaRedirectPath(supabase, {
    email: user.email,
    memberRole: null,
    next: safe,
  });

  if (mfaRedirectPath?.startsWith(MFA_SETUP_PATH)) {
    return NextResponse.redirect(new URL(mfaRedirectPath, request.url));
  }

  if (mfaRedirectPath?.startsWith("/admin/login")) {
    return response;
  }

  // Platform admin routes stay on the platform domain
  if (safe.startsWith("/platform-admin")) {
    return NextResponse.redirect(new URL(safe, request.url));
  }

  const slug = await getPrimaryTenantSlugForUser(supabase, user.id, user.email);
  if (slug) {
    return NextResponse.redirect(buildTenantAdminUrl(slug, safe, requestHost));
  }

  return response;
}

/** zalmox.app / test.zalmox.app: landing, signup, platform admin; tenant admin lives on subdomains. */
export async function platformProxy(request: NextRequest, path: string): Promise<NextResponse> {
  const requestHost = requestHostFrom(request);

  if (path === "/") return redirectToPath(request, "/landing");

  if (path.startsWith("/platform-admin")) return platformAdminProxy(request, path);

  // Admin lives on tenant subdomains — send guests to login, owners to subdomain
  if (
    (path.startsWith("/admin") &&
      path !== "/admin/login" &&
      !isMfaExemptAdminPath(path)) ||
    path.startsWith("/calendar") ||
    path.startsWith("/receptie")
  ) {
    const tenantRedirect = await redirectPlatformUserToTenantAdmin(
      request,
      requestHost,
      path.startsWith("/admin") ? path : "/admin"
    );
    if (tenantRedirect) return tenantRedirect;

    return redirectToPath(request, "/admin/login", path !== "/admin" ? { next: path } : {});
  }

  if (path === "/admin/login") return platformLoginProxy(request, requestHost);

  return intlMiddleware(request);
}

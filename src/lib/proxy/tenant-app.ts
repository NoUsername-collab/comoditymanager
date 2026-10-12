import { NextResponse, NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/security/safe-path";
import { ADMIN_LOCATION_UNLOCK_COOKIE } from "@/lib/auth/admin-location-unlock-cookie";
import { isAdminLocationUnlockTokenValidEdge } from "@/lib/auth/admin-location-unlock-edge";
import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import {
  pathPermissionGroup,
  pathRequiresOwner,
} from "@/domain/settings/team-permission-paths";
import { canStaffPermission } from "@/domain/settings/team-permissions";
import { getTeamPermissionsOnEdge } from "@/lib/auth/team-permissions-edge";
import {
  resolveTenantMemberRoleOnTenantHost,
  resolveTenantIdOnEdge,
} from "@/lib/auth/tenant-staff-edge";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import { routing } from "@/i18n/routing";
import { stripLocalePrefix } from "@/lib/proxy/request-context";
import { blockedTenantRedirectIfNeeded } from "@/lib/proxy/tenant-status";
import { resolveEffectiveStaffRole, mfaRedirectIfNeeded } from "@/lib/proxy/staff-mfa";
import { createProxySupabase, type ProxySupabase } from "@/lib/proxy/edge-session";
import { intlMiddleware } from "@/lib/proxy/intl";
import { redirectToPath } from "@/lib/proxy/redirect";

type TenantHostRef = { slug: string } | { customDomain: string };
type User = { id: string; email?: string };

function tenantHostRef(
  slug: string | undefined,
  customDomain: string | undefined
): TenantHostRef | null {
  if (slug != null) return { slug };
  if (customDomain != null) return { customDomain };
  return null;
}

function memberRoleOnHost(userId: string, host: TenantHostRef | null, supabase: ProxySupabase) {
  return host ? resolveTenantMemberRoleOnTenantHost(userId, host, supabase) : Promise.resolve(null);
}

/** Forward proxy-injected headers to RSC (intl middleware only sees a cloned request). */
function applyForwardedRequestHeaders(
  source: NextResponse,
  requestHeaders: Headers
): NextResponse {
  if (source.status >= 300 && source.status < 400) {
    return source;
  }

  const forwarded = NextResponse.next({
    request: { headers: requestHeaders },
  });

  source.cookies.getAll().forEach((cookie) => {
    forwarded.cookies.set(cookie);
  });

  for (const key of [
    "x-middleware-rewrite",
    "x-middleware-next",
    "x-nextjs-rewrite",
    "x-nextjs-matched-path",
  ]) {
    const value = source.headers.get(key);
    if (value) forwarded.headers.set(key, value);
  }

  return forwarded;
}

async function unauthorizedRedirect(request: NextRequest, supabase: ProxySupabase) {
  await supabase.auth.signOut();
  return redirectToPath(request, "/admin/login", { error: "unauthorized" });
}

/** Staff pages: role in this tenant, MFA, owner-only pages, team permissions, location lock. */
async function staffAccessRedirect(
  request: NextRequest,
  supabase: ProxySupabase,
  user: User,
  path: string,
  slug: string | undefined,
  customDomain: string | undefined
): Promise<NextResponse | null> {
  const effectiveRole = await resolveEffectiveStaffRole(
    user.id,
    user.email,
    slug,
    customDomain,
    supabase
  );
  if (!effectiveRole) return unauthorizedRedirect(request, supabase);

  const host = tenantHostRef(slug, customDomain);
  const memberRole = await memberRoleOnHost(user.id, host, supabase);

  const mfaRedirect = await mfaRedirectIfNeeded(request, supabase, user, path, memberRole);
  if (mfaRedirect) return mfaRedirect;

  if (!path.startsWith("/admin")) return null;

  if (pathRequiresOwner(path) && memberRole !== "owner") {
    return redirectToPath(request, "/admin/settings", { access: "role" });
  }

  const permGroup = pathPermissionGroup(path);
  if (!permGroup) return null;

  const tenantId = host ? await resolveTenantIdOnEdge(host) : null;
  const teamPermissions = tenantId ? await getTeamPermissionsOnEdge(tenantId) : null;

  if (!canStaffPermission(memberRole, permGroup, teamPermissions)) {
    return redirectToPath(request, "/admin/settings", { access: "permission" });
  }

  if (permGroup === "location_structure" && memberRole !== "owner") {
    const unlock = request.cookies.get(ADMIN_LOCATION_UNLOCK_COOKIE)?.value;
    if (!(await isAdminLocationUnlockTokenValidEdge(unlock))) {
      return redirectToPath(request, "/admin/settings", { location: "locked" });
    }
  }

  return null;
}

/** A signed-in user on the login page: check the tenant, then MFA, then go to `next`. */
async function signedInLoginRedirect(
  request: NextRequest,
  supabase: ProxySupabase,
  loginResponse: NextResponse,
  user: User,
  path: string,
  slug: string | undefined,
  customDomain: string | undefined
): Promise<NextResponse> {
  const blockedOnLogin = await blockedTenantRedirectIfNeeded(request, path, slug, customDomain);
  if (blockedOnLogin) {
    await supabase.auth.signOut();
    return blockedOnLogin;
  }

  const effectiveRole = await resolveEffectiveStaffRole(
    user.id,
    user.email,
    slug,
    customDomain,
    supabase
  );
  if ((slug || customDomain) && !effectiveRole) {
    return unauthorizedRedirect(request, supabase);
  }

  const memberRole = await memberRoleOnHost(user.id, tenantHostRef(slug, customDomain), supabase);

  const loginNext = request.nextUrl.searchParams.get("next") || "/receptie";
  const mfaRedirectPath = await resolveMfaRedirectPath(supabase, {
    email: user.email,
    memberRole,
    next: loginNext,
  });

  if (mfaRedirectPath?.startsWith(MFA_SETUP_PATH)) {
    return NextResponse.redirect(new URL(mfaRedirectPath, request.url));
  }

  if (mfaRedirectPath?.startsWith("/admin/login")) {
    return loginResponse;
  }

  const safe = safeInternalPath(loginNext, "/receptie");
  return NextResponse.redirect(new URL(safe, request.url));
}

/** The tenant app (public site, reception, admin) on a tenant subdomain or custom domain. */
export async function runTenantAppProxy(
  request: NextRequest,
  slug: string | undefined,
  customDomain: string | undefined,
  routingKind: TenantDomainRoutingKind = "platform_subdomain"
): Promise<NextResponse> {
  const path = stripLocalePrefix(request.nextUrl.pathname, routing.locales);
  const requestHeaders = new Headers(request.headers);
  if (slug) requestHeaders.set("x-tenant-slug", slug);
  if (customDomain) requestHeaders.set("x-tenant-domain", customDomain);
  requestHeaders.set("x-tenant-domain-kind", routingKind);
  requestHeaders.set("x-admin-path", path);

  const tenantRequest = new NextRequest(request.url, {
    headers: requestHeaders,
  });

  const blockedRedirect = await blockedTenantRedirectIfNeeded(
    request,
    path,
    slug,
    customDomain
  );
  if (blockedRedirect) return blockedRedirect;

  if (path === "/landing" || path === "/signup" || path === "/preturi") {
    return redirectToPath(request, "/");
  }

  const response = intlMiddleware(tenantRequest);

  const supabase = createProxySupabase(tenantRequest, response);
  if (!supabase) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = path === "/admin/login";
  const staffOnly =
    path === "/receptie" || path.startsWith("/calendar/confirm/");
  const needsStaff = (path.startsWith("/admin") && !isLoginPage) || staffOnly;

  if (needsStaff && !user) {
    return redirectToPath(request, "/admin/login", { next: path });
  }

  if (needsStaff && user) {
    const denied = await staffAccessRedirect(request, supabase, user, path, slug, customDomain);
    if (denied) return denied;
  }

  if (isLoginPage && user) {
    return signedInLoginRedirect(request, supabase, response, user, path, slug, customDomain);
  }

  if (slug) {
    response.headers.set("x-tenant-slug", slug);
  }
  if (customDomain) {
    response.headers.set("x-tenant-domain", customDomain);
  }
  response.headers.set("x-admin-path", path);

  return applyForwardedRequestHeaders(response, requestHeaders);
}

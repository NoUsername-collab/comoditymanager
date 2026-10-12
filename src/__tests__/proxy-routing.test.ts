import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * Pins what the proxy does for each kind of request: sign-in walls, roles, team
 * permissions, the location lock, post-login redirects, platform and custom domains.
 * Written before splitting src/proxy.ts so the split cannot change behaviour.
 */

const intlMiddleware = vi.fn(() => NextResponse.next());
const getUser = vi.fn();
const signOut = vi.fn();
const lookupTenantHostOnEdge = vi.fn();
const resolveEffectiveStaffRole = vi.fn();
const mfaRedirectIfNeeded = vi.fn();
const resolveTenantMemberRoleOnTenantHost = vi.fn();
const resolveTenantIdOnEdge = vi.fn();
const getTeamPermissionsOnEdge = vi.fn();
const isAdminLocationUnlockTokenValidEdge = vi.fn();
const resolveMfaRedirectPath = vi.fn();
const getPrimaryTenantSlugForUser = vi.fn();
const resolveDomainRoutingOnEdge = vi.fn();

vi.mock("next-intl/middleware", () => ({ default: () => intlMiddleware }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser, signOut } })),
}));
vi.mock("@/lib/env/edge", () => ({
  getEdgeSupabaseConfig: () => ({ configured: true, url: "https://example.supabase.co", key: "anon" }),
}));
vi.mock("@/lib/auth/alpha-gate-edge", () => ({
  isAlphaGateEnabled: () => false,
  isAlphaGateExemptPath: () => true,
}));
vi.mock("@/lib/auth/mfa-redirect", () => ({ resolveMfaRedirectPath }));
vi.mock("@/lib/tenant/domain-routing-edge", () => ({ resolveDomainRoutingOnEdge }));
vi.mock("@/lib/tenant/tenant-host-edge", () => ({ lookupTenantHostOnEdge }));
vi.mock("@/services/tenant-members", () => ({ getPrimaryTenantSlugForUser }));
vi.mock("@/lib/proxy/staff-mfa", () => ({ resolveEffectiveStaffRole, mfaRedirectIfNeeded }));
vi.mock("@/lib/auth/tenant-staff-edge", () => ({
  resolveTenantMemberRoleOnTenantHost,
  resolveTenantIdOnEdge,
}));
vi.mock("@/lib/auth/team-permissions-edge", () => ({ getTeamPermissionsOnEdge }));
vi.mock("@/lib/auth/admin-location-unlock-edge", () => ({ isAdminLocationUnlockTokenValidEdge }));

const { proxy } = await import("@/proxy");

const STAFF = { id: "u1", email: "staff@casa.ro" };

function tenant(pathname: string) {
  return new NextRequest(`https://casaemil.zalmox.app${pathname}`, {
    headers: { host: "casaemil.zalmox.app" },
  });
}
function platform(pathname: string) {
  return new NextRequest(`https://test.zalmox.app${pathname}`, {
    headers: { host: "test.zalmox.app" },
  });
}
function custom(pathname: string) {
  return new NextRequest(`https://www.pensiune.ro${pathname}`, {
    headers: { host: "www.pensiune.ro" },
  });
}
const location = (r: Response) => r.headers.get("location") ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  intlMiddleware.mockImplementation(() => NextResponse.next());
  getUser.mockResolvedValue({ data: { user: null } });
  lookupTenantHostOnEdge.mockResolvedValue({ tenantId: "t1", slug: "casaemil", status: "active" });
  resolveEffectiveStaffRole.mockResolvedValue("admin");
  mfaRedirectIfNeeded.mockResolvedValue(null);
  resolveTenantMemberRoleOnTenantHost.mockResolvedValue("admin");
  resolveTenantIdOnEdge.mockResolvedValue("t1");
  getTeamPermissionsOnEdge.mockResolvedValue(null);
  isAdminLocationUnlockTokenValidEdge.mockResolvedValue(false);
  resolveMfaRedirectPath.mockResolvedValue(null);
  getPrimaryTenantSlugForUser.mockResolvedValue(null);
  resolveDomainRoutingOnEdge.mockResolvedValue(null);
});

describe("tenant host", () => {
  it("sends signed-out visitors of /admin to login, keeping where they were going", async () => {
    const r = await proxy(tenant("/admin/cazari"));
    expect(location(r)).toBe("https://casaemil.zalmox.app/admin/login?next=%2Fadmin%2Fcazari");
  });

  it("asks for login on staff-only public paths", async () => {
    expect(location(await proxy(tenant("/receptie")))).toContain("/admin/login?next=%2Freceptie");
    expect(location(await proxy(tenant("/calendar/confirm/abc")))).toContain("/admin/login");
  });

  it("lets signed-out visitors see public pages, tagged with the tenant", async () => {
    const r = await proxy(tenant("/calendar"));
    expect(r.status).toBe(200);
    expect(location(r)).toBe("");
  });

  it("sends platform-only pages back to the tenant home", async () => {
    expect(location(await proxy(tenant("/signup")))).toBe("https://casaemil.zalmox.app/");
  });

  it("signs out a user with no role in this tenant", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    resolveEffectiveStaffRole.mockResolvedValue(null);
    const r = await proxy(tenant("/admin"));
    expect(signOut).toHaveBeenCalled();
    expect(location(r)).toContain("/admin/login?error=unauthorized");
  });

  it("keeps owner-only settings from other roles", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    const r = await proxy(tenant("/admin/settings/team-permissions"));
    expect(location(r)).toContain("/admin/settings?access=role");
  });

  it("applies team permissions", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    resolveTenantMemberRoleOnTenantHost.mockResolvedValue("operator");
    const r = await proxy(tenant("/admin/settings/staff"));
    expect(location(r)).toContain("/admin/settings?access=permission");
  });

  it("locks buildings and rooms for admins without an unlock", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    const r = await proxy(tenant("/admin/rooms"));
    expect(location(r)).toContain("/admin/settings?location=locked");
  });

  it("lets admins in with a valid unlock, and owners always", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    isAdminLocationUnlockTokenValidEdge.mockResolvedValue(true);
    expect((await proxy(tenant("/admin/rooms"))).status).toBe(200);

    isAdminLocationUnlockTokenValidEdge.mockResolvedValue(false);
    resolveTenantMemberRoleOnTenantHost.mockResolvedValue("owner");
    expect((await proxy(tenant("/admin/rooms"))).status).toBe(200);
  });

  it("follows the MFA redirect when one is due", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    mfaRedirectIfNeeded.mockResolvedValue(NextResponse.redirect("https://casaemil.zalmox.app/admin/security/mfa"));
    expect(location(await proxy(tenant("/admin")))).toContain("/admin/security/mfa");
  });

  it("sends a signed-in user away from login to a safe next page", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    expect(location(await proxy(tenant("/admin/login?next=/admin/cazari")))).toBe(
      "https://casaemil.zalmox.app/admin/cazari",
    );
    expect(location(await proxy(tenant("/admin/login?next=//evil.com")))).toBe(
      "https://casaemil.zalmox.app/receptie",
    );
  });
});

describe("platform host", () => {
  it("lets API routes through untouched", async () => {
    const r = await proxy(platform("/api/health"));
    expect(r.status).toBe(200);
    expect(intlMiddleware).not.toHaveBeenCalled();
  });

  it("opens the landing page at /", async () => {
    expect(location(await proxy(platform("/")))).toBe("https://test.zalmox.app/landing");
  });

  it("sends tenant admin paths to login when signed out", async () => {
    expect(location(await proxy(platform("/admin/cazari")))).toBe(
      "https://test.zalmox.app/admin/login?next=%2Fadmin%2Fcazari",
    );
  });

  it("sends signed-in owners to their tenant subdomain", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    getPrimaryTenantSlugForUser.mockResolvedValue("casaemil");
    expect(location(await proxy(platform("/admin/cazari")))).toContain("casaemil.");
    expect(location(await proxy(platform("/admin/login?next=/admin/x")))).toContain("casaemil.");
  });

  it("keeps platform-admin targets on the platform after login", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    expect(location(await proxy(platform("/admin/login?next=/platform-admin/tenants")))).toBe(
      "https://test.zalmox.app/platform-admin/tenants",
    );
  });

  it("denies /platform-admin to signed-in non-platform users", async () => {
    getUser.mockResolvedValue({ data: { user: STAFF } });
    expect(location(await proxy(platform("/platform-admin")))).toBe("https://test.zalmox.app/landing");
  });
});

describe("custom domain", () => {
  it("sends unknown domains to the platform landing page", async () => {
    lookupTenantHostOnEdge.mockResolvedValue(null);
    const r = await proxy(custom("/"));
    expect(location(r)).toContain("/landing");
  });

  it("sends staff paths on a public-only domain to the tenant subdomain", async () => {
    resolveDomainRoutingOnEdge.mockResolvedValue({ slug: "casaemil", routingKind: "custom_public" });
    const r = await proxy(custom("/admin/cazari"));
    expect(location(r)).toContain("casaemil.");
    expect(location(r)).toContain("/admin/cazari");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = vi.fn(() => NextResponse.next());
const getUser = vi.fn();

vi.mock("next-intl/middleware", () => ({
  default: () => intlMiddleware,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

vi.mock("@/lib/env/edge", () => ({
  getEdgeSupabaseConfig: () => ({
    configured: true,
    url: "https://example.supabase.co",
    key: "anon-key",
  }),
}));

vi.mock("@/lib/auth/alpha-gate-edge", () => ({
  isAlphaGateEnabled: () => false,
  isAlphaGateExemptPath: () => true,
}));

vi.mock("@/lib/auth/mfa-redirect", () => ({
  resolveMfaRedirectPath: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/tenant/domain-routing-edge", () => ({
  resolveDomainRoutingOnEdge: vi.fn(),
}));

vi.mock("@/services/tenant-members", () => ({
  getPrimaryTenantSlugForUser: vi.fn(),
}));

const { proxy } = await import("@/proxy");

function platformRequest(pathname: string) {
  return new NextRequest(`https://test.hospira.ro${pathname}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: null } });
  intlMiddleware.mockImplementation(() => NextResponse.next());
});

describe("proxy platform platform-admin", () => {
  it("does not redirect /platform-admin to itself", async () => {
    const response = await proxy(platformRequest("/platform-admin"));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).not.toBe("https://test.hospira.ro/platform-admin");
    expect(location).toContain("/admin/login");
    expect(location).toContain("next=%2Fplatform-admin");
  });

  it("does not redirect /ro/platform-admin to itself", async () => {
    const response = await proxy(platformRequest("/ro/platform-admin"));

    expect(response.status).toBeGreaterThanOrEqual(300);
    expect(response.status).toBeLessThan(400);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).not.toContain("/platform-admin/platform-admin");
    expect(location).not.toMatch(/\/platform-admin\/?$/);
    expect(location).toContain("/admin/login");
  });

  it("redirects legacy /nestio-admin to /platform-admin", async () => {
    const response = await proxy(platformRequest("/nestio-admin"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://test.hospira.ro/platform-admin"
    );
  });

  it("redirects legacy /ro/nestio-admin to /ro/platform-admin", async () => {
    const response = await proxy(platformRequest("/ro/nestio-admin"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://test.hospira.ro/ro/platform-admin"
    );
  });

  it("redirects legacy /hospira-admin to /platform-admin", async () => {
    const response = await proxy(platformRequest("/hospira-admin"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://test.hospira.ro/platform-admin"
    );
  });

  it("redirects legacy /ro/hospira-admin to /ro/platform-admin", async () => {
    const response = await proxy(platformRequest("/ro/hospira-admin"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://test.hospira.ro/ro/platform-admin"
    );
  });
});

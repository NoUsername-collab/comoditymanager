import { describe, it, expect, vi } from "vitest";

// Mock transitive dependencies that pull in Next.js / next-intl at import time
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUser: vi.fn() }));
vi.mock("@/services/tenant-members", () => ({ getTenantMemberRole: vi.fn() }));
vi.mock("@/lib/tenant/active", () => ({ resolveRequestTenant: vi.fn() }));
vi.mock("@/lib/tenant/guards", () => ({ requireTenantIdForData: vi.fn() }));

import {
  withTenantId,
  tenantCacheKey,
  tenantCacheTag,
} from "@/lib/tenant/scope";

// ---------------------------------------------------------------------------
// withTenantId
// ---------------------------------------------------------------------------

describe("withTenantId", () => {
  it("adds tenant_id to the row", () => {
    const result = withTenantId("t1", { name: "Room A" });
    expect(result).toEqual({ name: "Room A", tenant_id: "t1" });
  });

  it("preserves existing row data", () => {
    const result = withTenantId("t1", { a: 1, b: "two", c: true });
    expect(result).toMatchObject({ a: 1, b: "two", c: true, tenant_id: "t1" });
  });

  it("overwrites existing tenant_id if present", () => {
    const result = withTenantId("t2", { tenant_id: "t1", name: "X" });
    expect(result.tenant_id).toBe("t2");
  });
});

// ---------------------------------------------------------------------------
// tenantCacheKey
// ---------------------------------------------------------------------------

describe("tenantCacheKey", () => {
  it("returns [tenantId, part] for a single part", () => {
    expect(tenantCacheKey("t1", "rooms")).toEqual(["t1", "rooms"]);
  });

  it("returns [tenantId, ...parts] for multiple parts", () => {
    expect(tenantCacheKey("t1", "rooms", "list", "v2")).toEqual([
      "t1",
      "rooms",
      "list",
      "v2",
    ]);
  });

  it("returns [tenantId] when no parts are provided", () => {
    expect(tenantCacheKey("t1")).toEqual(["t1"]);
  });
});

// ---------------------------------------------------------------------------
// tenantCacheTag
// ---------------------------------------------------------------------------

describe("tenantCacheTag", () => {
  it('returns "tenant-{id}-{suffix}"', () => {
    expect(tenantCacheTag("abc", "rooms")).toBe("tenant-abc-rooms");
  });
});

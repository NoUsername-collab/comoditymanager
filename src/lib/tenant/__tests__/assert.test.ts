import { describe, it, expect } from "vitest";
import { assertRowTenant } from "@/lib/tenant/assert";

describe("assertRowTenant", () => {
  const tenantId = "tenant-abc";

  it("returns the row when tenant_id matches", () => {
    const row = { tenant_id: "tenant-abc", name: "Test" };
    const result = assertRowTenant(row, tenantId, "booking");
    expect(result).toBe(row);
  });

  it("throws 'label.not_found' when row is null", () => {
    expect(() => assertRowTenant(null, tenantId, "booking")).toThrow(
      "booking.not_found"
    );
  });

  it("throws 'label.not_found' when row is undefined", () => {
    expect(() => assertRowTenant(undefined, tenantId, "room")).toThrow(
      "room.not_found"
    );
  });

  it("throws 'tenant.forbidden_cross_tenant' when tenant_id differs", () => {
    const row = { tenant_id: "tenant-other", name: "Test" };
    expect(() => assertRowTenant(row, tenantId, "booking")).toThrow(
      "tenant.forbidden_cross_tenant"
    );
  });

  it("preserves all row data in the return value", () => {
    const row = { tenant_id: "tenant-abc", id: "r1", name: "Camera 1", extra: 42 };
    const result = assertRowTenant(row, tenantId, "room");
    expect(result).toEqual(row);
    expect(result.id).toBe("r1");
    expect(result.extra).toBe(42);
  });
});

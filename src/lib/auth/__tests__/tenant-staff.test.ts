import { describe, it, expect } from "vitest";
import { tenantMemberRoleToStaffRole } from "@/lib/auth/tenant-staff";

describe("tenantMemberRoleToStaffRole", () => {
  it('maps "operator" to "operator"', () => {
    expect(tenantMemberRoleToStaffRole("operator")).toBe("operator");
  });

  it('maps "admin" to "admin"', () => {
    expect(tenantMemberRoleToStaffRole("admin")).toBe("admin");
  });

  it('maps "owner" to "admin"', () => {
    expect(tenantMemberRoleToStaffRole("owner")).toBe("admin");
  });

  it('maps any non-operator role to "admin"', () => {
    expect(
      tenantMemberRoleToStaffRole("staff" as Parameters<typeof tenantMemberRoleToStaffRole>[0])
    ).toBe("admin");
  });
});

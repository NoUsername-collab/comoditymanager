import { describe, it, expect } from "vitest";
import {
  getLegacyStaffRoleByEmail,
  pathBlockedForOperator,
} from "@/lib/auth/roles";
import { getAdminEmail, getOperatorEmail } from "@/lib/auth/constants";

// ---------------------------------------------------------------------------
// getLegacyStaffRoleByEmail
// ---------------------------------------------------------------------------
describe("getLegacyStaffRoleByEmail", () => {
  it("returns 'admin' for the admin email", () => {
    expect(getLegacyStaffRoleByEmail(getAdminEmail())).toBe("admin");
  });

  it("returns 'admin' for admin email with different casing", () => {
    expect(getLegacyStaffRoleByEmail(getAdminEmail().toUpperCase())).toBe("admin");
  });

  it("returns 'operator' for the operator email", () => {
    expect(getLegacyStaffRoleByEmail(getOperatorEmail())).toBe("operator");
  });

  it("returns null for an unrecognized email", () => {
    expect(getLegacyStaffRoleByEmail("other@example.com")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(getLegacyStaffRoleByEmail(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pathBlockedForOperator
// ---------------------------------------------------------------------------
describe("pathBlockedForOperator", () => {
  it("blocks /admin/buildings", () => {
    expect(pathBlockedForOperator("/admin/buildings")).toBe(true);
  });

  it("blocks /admin/buildings/sub-path", () => {
    expect(pathBlockedForOperator("/admin/buildings/123")).toBe(true);
  });

  it("blocks /admin/rooms", () => {
    expect(pathBlockedForOperator("/admin/rooms")).toBe(true);
  });

  it("blocks /admin/rooms/sub-path", () => {
    expect(pathBlockedForOperator("/admin/rooms/edit")).toBe(true);
  });

  it("blocks /admin/settings/location", () => {
    expect(pathBlockedForOperator("/admin/settings/location")).toBe(true);
  });

  it("blocks /admin/settings/location/sub-path", () => {
    expect(pathBlockedForOperator("/admin/settings/location/edit")).toBe(true);
  });

  it("does not block /admin/bookings", () => {
    expect(pathBlockedForOperator("/admin/bookings")).toBe(false);
  });

  it("does not block /admin/guests", () => {
    expect(pathBlockedForOperator("/admin/guests")).toBe(false);
  });

  it("does not block /admin/settings (without /location)", () => {
    expect(pathBlockedForOperator("/admin/settings")).toBe(false);
  });

  it("does not block root path", () => {
    expect(pathBlockedForOperator("/")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  canStaffPermission,
  DEFAULT_TEAM_PERMISSIONS,
  parseTeamPermissions,
} from "@/domain/settings/team-permissions";

describe("parseTeamPermissions", () => {
  it("returns defaults for invalid input", () => {
    expect(parseTeamPermissions(null)).toEqual(DEFAULT_TEAM_PERMISSIONS);
    expect(parseTeamPermissions("x")).toEqual(DEFAULT_TEAM_PERMISSIONS);
  });

  it("merges partial overrides", () => {
    const parsed = parseTeamPermissions({
      operator: { booking_management: true },
    });
    expect(parsed.operator.booking_management).toBe(true);
    expect(parsed.operator.reception_ops).toBe(true);
    expect(parsed.operator.pension_settings).toBe(false);
  });
});

describe("canStaffPermission", () => {
  const custom = parseTeamPermissions({
    operator: { booking_management: true },
  });

  it("owner always has access", () => {
    expect(canStaffPermission("owner", "reports_tools", custom)).toBe(true);
    expect(canStaffPermission("owner", "team_admin", null)).toBe(true);
  });

  it("respects operator toggles", () => {
    expect(canStaffPermission("operator", "booking_management", custom)).toBe(
      true,
    );
    expect(canStaffPermission("operator", "pension_settings", custom)).toBe(
      false,
    );
  });

  it("uses admin defaults when permissions null", () => {
    expect(canStaffPermission("admin", "booking_management", null)).toBe(true);
    expect(canStaffPermission("admin", "reports_tools", null)).toBe(false);
  });

  it("denies unknown member", () => {
    expect(canStaffPermission(null, "reception_ops", custom)).toBe(false);
  });
});

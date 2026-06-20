import { describe, expect, it } from "vitest";
import {
  ADMIN_MORE_LINKS,
  filterAdminMoreLinks,
} from "@/layout/mobile/admin-more-links";
import {
  filterSettingsNav,
  SETTINGS_NAV_GROUPS,
} from "@/domain/settings/settings-nav";
import {
  pathPermissionGroup,
  pathRequiresOwner,
} from "@/domain/settings/team-permission-paths";
import { DEFAULT_TEAM_PERMISSIONS } from "@/domain/settings/team-permissions";

const ctx = (memberRole: "owner" | "admin" | "operator") => ({
  role: memberRole === "operator" ? ("operator" as const) : ("admin" as const),
  memberRole,
  teamPermissions: DEFAULT_TEAM_PERMISSIONS,
});

function navItemIds(memberRole: "owner" | "admin" | "operator") {
  return filterSettingsNav(SETTINGS_NAV_GROUPS, ctx(memberRole)).flatMap((g) =>
    g.items.map((i) => i.id),
  );
}

describe("filterSettingsNav operator ACL (default permissions)", () => {
  it("hides pension and team settings from operator", () => {
    const ids = navItemIds("operator");
    expect(ids).not.toContain("identity");
    expect(ids).not.toContain("booking");
    expect(ids).not.toContain("fiscal");
    expect(ids).not.toContain("checkin");
    expect(ids).not.toContain("guest-app");
    expect(ids).not.toContain("public-site");
    expect(ids).not.toContain("email");
    expect(ids).not.toContain("domains");
    expect(ids).not.toContain("team");
    expect(ids).not.toContain("team-permissions");
    expect(ids).not.toContain("location");
    expect(ids).not.toContain("statistics");
  });

  it("shows overview, appearance, and security to operator", () => {
    const ids = navItemIds("operator");
    expect(ids).toEqual(
      expect.arrayContaining(["overview", "appearance", "security"]),
    );
  });
});

describe("filterSettingsNav admin ACL (default permissions)", () => {
  it("shows pension and team settings but hides owner-only pages", () => {
    const ids = navItemIds("admin");
    expect(ids).toEqual(
      expect.arrayContaining([
        "overview",
        "identity",
        "appearance",
        "booking",
        "fiscal",
        "checkin",
        "guest-app",
        "public-site",
        "email",
        "domains",
        "security",
        "team",
        "location",
      ]),
    );
    expect(ids).not.toContain("statistics");
    expect(ids).not.toContain("team-permissions");
  });
});

describe("filterSettingsNav owner ACL (default permissions)", () => {
  it("shows all settings nav items", () => {
    const ids = navItemIds("owner");
    expect(ids).toEqual(
      expect.arrayContaining([
        "overview",
        "identity",
        "appearance",
        "booking",
        "fiscal",
        "checkin",
        "guest-app",
        "public-site",
        "email",
        "domains",
        "security",
        "statistics",
        "team",
        "team-permissions",
        "location",
      ]),
    );
  });
});

describe("filterSettingsNav statistics ACL", () => {
  it("shows statistics ACL only to owner", () => {
    const ownerNav = filterSettingsNav(SETTINGS_NAV_GROUPS, ctx("owner"));
    const adminNav = filterSettingsNav(SETTINGS_NAV_GROUPS, ctx("admin"));

    expect(
      ownerNav.some((g) => g.id === "access" && g.items.some((i) => i.id === "statistics")),
    ).toBe(true);
    expect(
      adminNav.some((g) => g.id === "access" && g.items.some((i) => i.id === "statistics")),
    ).toBe(false);
    expect(
      adminNav.some((g) => g.id === "access" && g.items.some((i) => i.id === "security")),
    ).toBe(true);
  });

  it("does not keep statistics under operations", () => {
    const ownerNav = filterSettingsNav(SETTINGS_NAV_GROUPS, ctx("owner"));
    const operations = ownerNav.find((g) => g.id === "operations");
    expect(operations?.items.some((i) => i.id === "statistics")).toBe(false);
  });
});

describe("pathPermissionGroup alignment", () => {
  it("does not require pension_settings for appearance", () => {
    expect(pathPermissionGroup("/admin/settings/appearance")).toBeNull();
  });

  it("maps pension settings routes to pension_settings", () => {
    expect(pathPermissionGroup("/admin/settings/identity")).toBe("pension_settings");
    expect(pathPermissionGroup("/admin/settings/fiscal")).toBe("pension_settings");
  });

  it("maps staff and location routes to their permission groups", () => {
    expect(pathPermissionGroup("/admin/settings/staff")).toBe("team_admin");
    expect(pathPermissionGroup("/admin/settings/location")).toBe("location_structure");
  });
});

describe("pathRequiresOwner", () => {
  it("flags owner-only settings routes", () => {
    expect(pathRequiresOwner("/admin/settings/statistics")).toBe(true);
    expect(pathRequiresOwner("/admin/settings/team-permissions")).toBe(true);
  });

  it("does not flag general settings routes", () => {
    expect(pathRequiresOwner("/admin/settings/appearance")).toBe(false);
    expect(pathRequiresOwner("/admin/settings/fiscal")).toBe(false);
  });
});

describe("filterAdminMoreLinks statistics entry", () => {
  it("hides statistics when user lacks access", () => {
    const links = filterAdminMoreLinks(ADMIN_MORE_LINKS, {
      locationUnlocked: true,
      statisticsAccess: false,
    });
    expect(links.some((l) => l.href === "/admin/statistics")).toBe(false);
  });

  it("shows statistics when user has access", () => {
    const links = filterAdminMoreLinks(ADMIN_MORE_LINKS, {
      locationUnlocked: true,
      statisticsAccess: true,
    });
    expect(links.some((l) => l.href === "/admin/statistics")).toBe(true);
  });
});

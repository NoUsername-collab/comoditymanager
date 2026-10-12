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
  it("hides pension, appearance, and team settings from operator", () => {
    const ids = navItemIds("operator");
    expect(ids).not.toContain("identity");
    expect(ids).not.toContain("appearance");
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

  it("shows overview and security to operator", () => {
    const ids = navItemIds("operator");
    expect(ids).toEqual(expect.arrayContaining(["overview", "security"]));
    expect(ids).not.toContain("appearance");
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
        "team",
        "team-permissions",
        "location",
      ]),
    );
  });
});

describe("filterSettingsNav statistics ACL", () => {
  it("keeps statistics access inside owner-only team permissions", () => {
    const ownerNav = filterSettingsNav(SETTINGS_NAV_GROUPS, ctx("owner"));
    const adminNav = filterSettingsNav(SETTINGS_NAV_GROUPS, ctx("admin"));
    const ids = (nav: typeof ownerNav) => nav.flatMap((g) => g.items.map((i) => i.id));

    expect(ids(ownerNav)).not.toContain("statistics");
    expect(ids(ownerNav)).toContain("team-permissions");
    expect(ids(adminNav)).not.toContain("team-permissions");
    expect(ids(adminNav)).toContain("security");
  });
});

describe("settings nav information architecture", () => {
  it("groups settings by information architecture", () => {
    // Setup order first (property, rooms, site and email), extras last.
    expect(SETTINGS_NAV_GROUPS.map((g) => g.id)).toEqual([
      "pension",
      "rooms",
      "channels",
      "stay",
      "money",
      "team",
      "account",
      "later",
    ]);
  });

  it("hides team permissions until someone is invited", () => {
    const ids = (hasTeam?: boolean) =>
      filterSettingsNav(SETTINGS_NAV_GROUPS, { role: "admin", memberRole: "owner", hasTeam })
        .flatMap((g) => g.items)
        .map((item) => item.id);

    expect(ids(false)).not.toContain("team-permissions");
    expect(ids(false)).toContain("team");
    expect(ids(true)).toContain("team-permissions");
    expect(ids()).toContain("team-permissions");
  });
});

describe("pathPermissionGroup alignment", () => {
  it("requires pension_settings for appearance", () => {
    expect(pathPermissionGroup("/admin/settings/appearance")).toBe("pension_settings");
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

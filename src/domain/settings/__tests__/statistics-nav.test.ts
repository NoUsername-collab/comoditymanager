import { describe, expect, it } from "vitest";
import {
  ADMIN_MORE_LINKS,
  filterAdminMoreLinks,
} from "@/layout/mobile/admin-more-links";
import {
  filterSettingsNav,
  SETTINGS_NAV_GROUPS,
} from "@/domain/settings/settings-nav";

describe("filterSettingsNav operator ACL", () => {
  const ctx = (memberRole: "owner" | "admin" | "operator") => ({
    role: memberRole === "operator" ? ("operator" as const) : ("admin" as const),
    memberRole,
  });

  function navItemIds(memberRole: "owner" | "admin" | "operator") {
    return filterSettingsNav(SETTINGS_NAV_GROUPS, ctx(memberRole)).flatMap((g) =>
      g.items.map((i) => i.id),
    );
  }

  it("hides admin-only settings from operator", () => {
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
    expect(ids).not.toContain("location");
  });

  it("shows overview and appearance to operator", () => {
    const ids = navItemIds("operator");
    expect(ids).toContain("overview");
    expect(ids).toContain("appearance");
    expect(ids).toContain("security");
  });
});

describe("filterSettingsNav statistics ACL", () => {
  const ctx = (memberRole: "owner" | "admin" | "operator") => ({
    role: memberRole === "operator" ? ("operator" as const) : ("admin" as const),
    memberRole,
  });

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

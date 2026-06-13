export type SettingsNavItem = {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  href: string;
  /** Match pathname prefix for sub-routes */
  matchPath?: string;
  /** Inline hub section (?section=) */
  section?: string;
  roles?: Array<"owner" | "admin" | "operator">;
  memberRoles?: Array<"owner" | "admin" | "operator">;
};

export type SettingsNavGroup = {
  id: string;
  labelKey: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "personal",
    labelKey: "navGroupPersonal",
    items: [
      {
        id: "overview",
        labelKey: "navOverview",
        descriptionKey: "navOverviewDesc",
        href: "/admin/settings",
        section: "overview",
      },
      {
        id: "appearance",
        labelKey: "navAppearance",
        descriptionKey: "navAppearanceDesc",
        href: "/admin/settings?section=appearance",
        section: "appearance",
      },
      {
        id: "preferences",
        labelKey: "navPreferences",
        descriptionKey: "navPreferencesDesc",
        href: "/admin/settings?section=preferences",
        section: "preferences",
      },
    ],
  },
  {
    id: "operations",
    labelKey: "navGroupOperations",
    items: [
      {
        id: "statistics",
        labelKey: "navStatistics",
        descriptionKey: "navStatisticsDesc",
        href: "/admin/settings?section=statistics",
        section: "statistics",
        memberRoles: ["owner", "admin", "operator"],
      },
      {
        id: "checkin",
        labelKey: "navCheckin",
        descriptionKey: "navCheckinDesc",
        href: "/admin/settings?section=checkin",
        section: "checkin",
        roles: ["admin"],
      },
      {
        id: "history",
        labelKey: "navHistory",
        descriptionKey: "navHistoryDesc",
        href: "/admin/settings?section=history",
        section: "history",
      },
    ],
  },
  {
    id: "channels",
    labelKey: "navGroupChannels",
    items: [
      {
        id: "guest-app",
        labelKey: "navGuestApp",
        descriptionKey: "navGuestAppDesc",
        href: "/admin/settings/guest-app",
        matchPath: "/admin/settings/guest-app",
        memberRoles: ["owner", "admin"],
      },
      {
        id: "public-site",
        labelKey: "navPublicSite",
        descriptionKey: "navPublicSiteDesc",
        href: "/admin/settings/public-site",
        matchPath: "/admin/settings/public-site",
        memberRoles: ["owner", "admin"],
      },
      {
        id: "domains",
        labelKey: "navDomains",
        descriptionKey: "navDomainsDesc",
        href: "/admin/settings/domains",
        matchPath: "/admin/settings/domains",
        roles: ["admin"],
      },
    ],
  },
  {
    id: "organization",
    labelKey: "navGroupOrganization",
    items: [
      {
        id: "team",
        labelKey: "navTeam",
        descriptionKey: "navTeamDesc",
        href: "/admin/settings/staff",
        matchPath: "/admin/settings/staff",
        roles: ["admin"],
      },
      {
        id: "location",
        labelKey: "navLocation",
        descriptionKey: "navLocationDesc",
        href: "/admin/settings/location",
        matchPath: "/admin/settings/location",
        memberRoles: ["owner", "admin"],
      },
    ],
  },
];

export function filterSettingsNav(
  groups: SettingsNavGroup[],
  ctx: {
    role: "admin" | "operator";
    memberRole: "owner" | "admin" | "operator";
    statisticsAccess?: boolean;
  },
): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.id === "statistics") {
          return ctx.memberRole === "owner" || ctx.statisticsAccess === true;
        }
        if (item.roles && !item.roles.includes(ctx.role)) return false;
        if (item.memberRoles && !item.memberRoles.includes(ctx.memberRole)) {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolveActiveSettingsNavId(
  pathname: string,
  section: string | null,
): string {
  for (const group of SETTINGS_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.matchPath && pathname.startsWith(item.matchPath)) {
        return item.id;
      }
    }
  }

  if (pathname === "/admin/settings" || pathname.endsWith("/settings")) {
    if (section && section !== "overview") {
      const match = SETTINGS_NAV_GROUPS.flatMap((g) => g.items).find(
        (i) => i.section === section,
      );
      if (match) return match.id;
    }
    return "overview";
  }

  if (pathname.includes("/settings/location")) return "location";
  return "overview";
}

export type SettingsNavItem = {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  href: string;
  matchPath?: string;
  roles?: Array<"owner" | "admin" | "operator">;
  memberRoles?: Array<"owner" | "admin" | "operator">;
};

export type SettingsNavGroup = {
  id: string;
  labelKey: string;
  items: SettingsNavItem[];
};

/** Legacy ?section= values → dedicated routes */
export const SETTINGS_SECTION_REDIRECTS: Record<string, string> = {
  appearance: "/admin/settings/appearance",
  statistics: "/admin/settings/statistics",
  booking: "/admin/settings/booking",
  fiscal: "/admin/settings/fiscal",
  checkin: "/admin/settings/checkin",
  email: "/admin/settings/email",
  identity: "/admin/settings/identity",
  preferences: "/admin/settings/appearance",
  history: "/admin/istoric",
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "identity",
    labelKey: "navGroupIdentity",
    items: [
      {
        id: "overview",
        labelKey: "navOverview",
        descriptionKey: "navOverviewDesc",
        href: "/admin/settings",
      },
      {
        id: "identity",
        labelKey: "navIdentity",
        descriptionKey: "navIdentityDesc",
        href: "/admin/settings/identity",
        matchPath: "/admin/settings/identity",
        memberRoles: ["owner", "admin"],
      },
      {
        id: "appearance",
        labelKey: "navAppearance",
        descriptionKey: "navAppearanceDesc",
        href: "/admin/settings/appearance",
        matchPath: "/admin/settings/appearance",
      },
    ],
  },
  {
    id: "operations",
    labelKey: "navGroupOperations",
    items: [
      {
        id: "booking",
        labelKey: "navBooking",
        descriptionKey: "navBookingDesc",
        href: "/admin/settings/booking",
        matchPath: "/admin/settings/booking",
        memberRoles: ["owner", "admin"],
      },
      {
        id: "fiscal",
        labelKey: "navFiscal",
        descriptionKey: "navFiscalDesc",
        href: "/admin/settings/fiscal",
        matchPath: "/admin/settings/fiscal",
        memberRoles: ["owner", "admin"],
      },
      {
        id: "checkin",
        labelKey: "navCheckin",
        descriptionKey: "navCheckinDesc",
        href: "/admin/settings/checkin",
        matchPath: "/admin/settings/checkin",
        roles: ["admin"],
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
        id: "email",
        labelKey: "navEmail",
        descriptionKey: "navEmailDesc",
        href: "/admin/settings/email",
        matchPath: "/admin/settings/email",
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
    id: "access",
    labelKey: "navGroupAccess",
    items: [
      {
        id: "statistics",
        labelKey: "navStatistics",
        descriptionKey: "navStatisticsDesc",
        href: "/admin/settings/statistics",
        matchPath: "/admin/settings/statistics",
        memberRoles: ["owner"],
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
  },
): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.roles && !item.roles.includes(ctx.role)) return false;
        if (item.memberRoles && !item.memberRoles.includes(ctx.memberRole)) {
          return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolveActiveSettingsNavId(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "");

  if (normalized === "/admin/settings") {
    return "overview";
  }

  for (const group of SETTINGS_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === "overview") continue;
      if (item.matchPath && normalized.startsWith(item.matchPath)) {
        return item.id;
      }
    }
  }

  if (normalized.includes("/settings/location")) return "location";
  return "overview";
}

import type { PermissionGroupId, TeamPermissions } from "@/domain/settings/team-permissions";
import { canStaffPermission } from "@/domain/settings/team-permissions";

export type SettingsNavItem = {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  href: string;
  matchPath?: string;
  roles?: Array<"owner" | "admin" | "operator">;
  memberRoles?: Array<"owner" | "admin" | "operator">;
  permissionGroup?: PermissionGroupId;
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
        permissionGroup: "pension_settings",
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
        permissionGroup: "pension_settings",
      },
      {
        id: "fiscal",
        labelKey: "navFiscal",
        descriptionKey: "navFiscalDesc",
        href: "/admin/settings/fiscal",
        matchPath: "/admin/settings/fiscal",
        permissionGroup: "pension_settings",
      },
      {
        id: "checkin",
        labelKey: "navCheckin",
        descriptionKey: "navCheckinDesc",
        href: "/admin/settings/checkin",
        matchPath: "/admin/settings/checkin",
        permissionGroup: "pension_settings",
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
        permissionGroup: "pension_settings",
      },
      {
        id: "public-site",
        labelKey: "navPublicSite",
        descriptionKey: "navPublicSiteDesc",
        href: "/admin/settings/public-site",
        matchPath: "/admin/settings/public-site",
        permissionGroup: "pension_settings",
      },
      {
        id: "email",
        labelKey: "navEmail",
        descriptionKey: "navEmailDesc",
        href: "/admin/settings/email",
        matchPath: "/admin/settings/email",
        permissionGroup: "pension_settings",
      },
      {
        id: "domains",
        labelKey: "navDomains",
        descriptionKey: "navDomainsDesc",
        href: "/admin/settings/domains",
        matchPath: "/admin/settings/domains",
        permissionGroup: "pension_settings",
      },
    ],
  },
  {
    id: "access",
    labelKey: "navGroupAccess",
    items: [
      {
        id: "security",
        labelKey: "navSecurity",
        descriptionKey: "navSecurityDesc",
        href: "/admin/settings/security",
        matchPath: "/admin/settings/security",
      },
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
        permissionGroup: "team_admin",
      },
      {
        id: "team-permissions",
        labelKey: "navTeamPermissions",
        descriptionKey: "navTeamPermissionsDesc",
        href: "/admin/settings/team-permissions",
        matchPath: "/admin/settings/team-permissions",
        memberRoles: ["owner"],
      },
      {
        id: "location",
        labelKey: "navLocation",
        descriptionKey: "navLocationDesc",
        href: "/admin/settings/location",
        matchPath: "/admin/settings/location",
        permissionGroup: "location_structure",
      },
    ],
  },
];

export function filterSettingsNav(
  groups: SettingsNavGroup[],
  ctx: {
    role: "admin" | "operator";
    memberRole: "owner" | "admin" | "operator";
    teamPermissions?: TeamPermissions | null;
  },
): SettingsNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.memberRoles && !item.memberRoles.includes(ctx.memberRole)) {
          return false;
        }
        if (item.roles && !item.roles.includes(ctx.role)) return false;
        if (item.permissionGroup) {
          if (
            !canStaffPermission(
              ctx.memberRole,
              item.permissionGroup,
              ctx.teamPermissions,
            )
          ) {
            return false;
          }
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Matches `src/i18n/routing.ts` — strip locale if usePathname ever keeps it. */
const SETTINGS_LOCALE_PREFIX = /^\/(ro|en|bg)(?=\/|$)/;

export function normalizeSettingsPath(pathname: string): string {
  let path = pathname.split(/[?#]/)[0] ?? pathname;
  path = path.replace(/\/$/, "") || "/";
  path = path.replace(SETTINGS_LOCALE_PREFIX, "") || "/";
  return path;
}

function settingsLayoutSegmentToNavId(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of SETTINGS_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === "overview") continue;
      const path = item.matchPath ?? item.href;
      const segment = path.split("/").filter(Boolean).at(-1);
      if (segment) map[segment] = item.id;
    }
  }
  return map;
}

const SETTINGS_SEGMENT_TO_NAV_ID = settingsLayoutSegmentToNavId();

/**
 * Active settings nav item. Prefer the layout child segment (reliable in
 * the settings layout) and fall back to the longest matching path.
 */
export function resolveActiveSettingsNavId(
  pathname: string,
  layoutSegment?: string | null,
): string {
  if (layoutSegment) {
    const fromSegment = SETTINGS_SEGMENT_TO_NAV_ID[layoutSegment];
    if (fromSegment) return fromSegment;
  }

  const normalized = normalizeSettingsPath(pathname);
  let bestId: string | null = null;
  let bestLen = 0;

  for (const group of SETTINGS_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.id === "overview") continue;
      const path = item.matchPath ?? item.href;
      if (normalized === path || normalized.startsWith(`${path}/`)) {
        if (path.length > bestLen) {
          bestId = item.id;
          bestLen = path.length;
        }
      }
    }
  }

  if (bestId) return bestId;
  if (normalized.includes("/settings/location")) return "location";
  if (normalized.includes("/settings/team-permissions")) return "team-permissions";
  return "overview";
}

import type { TenantMemberRole } from "@/domain/tenant/types";

export const PERMISSION_GROUP_IDS = [
  "reception_ops",
  "booking_management",
  "pension_settings",
  "location_structure",
  "team_admin",
  "reports_tools",
] as const;

export type PermissionGroupId = (typeof PERMISSION_GROUP_IDS)[number];

export type RolePermissionMap = Record<PermissionGroupId, boolean>;

export type TeamPermissions = {
  admin: RolePermissionMap;
  operator: RolePermissionMap;
};

export const DEFAULT_TEAM_PERMISSIONS: TeamPermissions = {
  admin: {
    reception_ops: true,
    booking_management: true,
    pension_settings: true,
    location_structure: true,
    team_admin: true,
    reports_tools: false,
  },
  operator: {
    reception_ops: true,
    booking_management: false,
    pension_settings: false,
    location_structure: false,
    team_admin: false,
    reports_tools: false,
  },
};

function parseRolePermissionMap(
  raw: unknown,
  role: keyof TeamPermissions,
): RolePermissionMap {
  const defaults = DEFAULT_TEAM_PERMISSIONS[role];
  if (!raw || typeof raw !== "object") return { ...defaults };

  const obj = raw as Record<string, unknown>;
  const result = { ...defaults };
  for (const id of PERMISSION_GROUP_IDS) {
    if (typeof obj[id] === "boolean") {
      result[id] = obj[id];
    }
  }
  return result;
}

export function parseTeamPermissions(raw: unknown): TeamPermissions {
  if (!raw || typeof raw !== "object") {
    return {
      admin: { ...DEFAULT_TEAM_PERMISSIONS.admin },
      operator: { ...DEFAULT_TEAM_PERMISSIONS.operator },
    };
  }

  const obj = raw as Record<string, unknown>;
  return {
    admin: parseRolePermissionMap(obj.admin, "admin"),
    operator: parseRolePermissionMap(obj.operator, "operator"),
  };
}

export function teamPermissionsToJson(permissions: TeamPermissions): TeamPermissions {
  return parseTeamPermissions(permissions);
}

/** Owner bypasses stored permissions — always full access. */
export function canStaffPermission(
  memberRole: TenantMemberRole | null,
  group: PermissionGroupId,
  permissions: TeamPermissions | null | undefined,
): boolean {
  if (!memberRole) return false;
  if (memberRole === "owner") return true;

  const resolved = permissions ?? DEFAULT_TEAM_PERMISSIONS;
  const roleKey = memberRole === "operator" ? "operator" : "admin";
  return resolved[roleKey][group];
}

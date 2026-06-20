import type { PermissionGroupId } from "@/domain/settings/team-permissions";

const PENSION_SETTINGS_PREFIXES = [
  "/admin/settings/identity",
  "/admin/settings/booking",
  "/admin/settings/fiscal",
  "/admin/settings/checkin",
  "/admin/settings/guest-app",
  "/admin/settings/public-site",
  "/admin/settings/email",
  "/admin/settings/domains",
  "/admin/settings/appearance",
] as const;

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Maps admin paths to the permission group required to access them. */
export function pathPermissionGroup(pathname: string): PermissionGroupId | null {
  const path = pathname.replace(/\/$/, "") || "/";

  if (
    matchesPrefix(path, "/admin/buildings") ||
    matchesPrefix(path, "/admin/rooms") ||
    matchesPrefix(path, "/admin/settings/location")
  ) {
    return "location_structure";
  }

  if (matchesPrefix(path, "/admin/settings/staff")) {
    return "team_admin";
  }

  if (
    matchesPrefix(path, "/admin/statistics") ||
    matchesPrefix(path, "/admin/simulation")
  ) {
    return "reports_tools";
  }

  for (const prefix of PENSION_SETTINGS_PREFIXES) {
    if (matchesPrefix(path, prefix)) {
      return "pension_settings";
    }
  }

  return null;
}

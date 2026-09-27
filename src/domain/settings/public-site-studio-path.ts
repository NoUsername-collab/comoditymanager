export function isSettingsStudioPath(adminPath: string | null | undefined): boolean {
  if (!adminPath) return false;
  const path = adminPath.split("?")[0]?.replace(/\/$/, "") ?? "";
  return path === "/admin/settings/public-site" || path === "/admin/settings/guest-app";
}

export function isPublicSiteStudioPath(adminPath: string | null | undefined): boolean {
  if (!adminPath) return false;
  const path = adminPath.split("?")[0]?.replace(/\/$/, "") ?? "";
  return path === "/admin/settings/public-site";
}

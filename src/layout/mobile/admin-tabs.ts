import type { HudIconName } from "@/components/admin/AdminHudIcons";

export type AdminNavTab = {
  href: string;
  labelKey: "home" | "stays" | "clients" | "calendar";
  icon: HudIconName;
  locationConfig?: boolean;
};

/** Primary HUD tabs — cereri noi live under Cazări (badge when count > 0). */
export const ADMIN_PRIMARY_TABS: AdminNavTab[] = [
  { href: "/admin", labelKey: "home", icon: "home" },
  { href: "/admin/calendar", labelKey: "calendar", icon: "calendar" },
  { href: "/admin/cazari", labelKey: "stays", icon: "bed" },
  { href: "/admin/guests", labelKey: "clients", icon: "person" },
];

export function filterAdminTabs(
  tabs: AdminNavTab[],
  locationUnlocked: boolean
): AdminNavTab[] {
  return tabs.filter((tab) => !tab.locationConfig || locationUnlocked);
}

export function isAdminTabActive(pathname: string, href: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

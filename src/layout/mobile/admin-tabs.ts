import type { HudIconName } from "@/components/admin/AdminHudIcons";

export type AdminNavTab = {
  href: string;
  labelKey: "home" | "newRequests" | "stays" | "clients" | "calendar";
  icon: HudIconName;
  locationConfig?: boolean;
};

export const ADMIN_PRIMARY_TABS: AdminNavTab[] = [
  { href: "/admin/bookings", labelKey: "newRequests", icon: "inbox" },
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
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

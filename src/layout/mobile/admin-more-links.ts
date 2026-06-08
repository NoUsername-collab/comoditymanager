import type { HudIconName } from "@/components/admin/AdminHudIcons";

export type AdminMoreLink = {
  href: string;
  labelKey:
    | "statistics"
    | "settings"
    | "disponibilitate"
    | "buildings"
    | "rooms"
    | "devlog";
  icon: HudIconName;
  locationConfig?: boolean;
};

export const ADMIN_MORE_LINKS: AdminMoreLink[] = [
  { href: "/admin/statistics", labelKey: "statistics", icon: "chart" },
  { href: "/admin/disponibilitate", labelKey: "disponibilitate", icon: "grid" },
  { href: "/admin/settings", labelKey: "settings", icon: "gear" },
  { href: "/admin/buildings", labelKey: "buildings", icon: "building", locationConfig: true },
  { href: "/admin/rooms", labelKey: "rooms", icon: "bed", locationConfig: true },
  { href: "/admin/devlog", labelKey: "devlog", icon: "history" },
];

export function filterAdminMoreLinks(
  links: AdminMoreLink[],
  locationUnlocked: boolean
): AdminMoreLink[] {
  return links.filter((link) => !link.locationConfig || locationUnlocked);
}

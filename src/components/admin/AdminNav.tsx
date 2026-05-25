"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AdminHudIcon,
  type HudIconName,
} from "@/components/admin/AdminHudIcons";

type Tab = {
  href: string;
  label: string;
  icon: HudIconName;
  alert?: boolean;
  badge?: number;
  /** Ascuns pentru operator (config doar după unlock locație). */
  locationConfig?: boolean;
};

export function AdminNav({
  cereriCount,
  locationUnlocked = false,
}: {
  cereriCount: number;
  locationUnlocked?: boolean;
}) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: "/admin", label: "Acasă", icon: "home" },
    {
      href: "/admin/bookings",
      label: "Cereri noi",
      icon: "inbox",
      alert: cereriCount > 0,
      badge: cereriCount,
    },
    { href: "/admin/cazari", label: "Cazări", icon: "bed" },
    { href: "/admin/guests", label: "Clienți", icon: "person" },
    { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
    { href: "/admin/disponibilitate", label: "Disponibilitate", icon: "grid" },
    { href: "/admin/statistics", label: "Statistici", icon: "chart" },
    { href: "/admin/istoric", label: "Istoric", icon: "history" },
    { href: "/admin/settings", label: "Setări", icon: "gear" },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.locationConfig) return true;
    return locationUnlocked;
  });

  return (
    <nav className="admin-nav admin-hud__nav" aria-label="Meniu administrare">
      {visibleTabs.map((tab) => {
        const active =
          tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);

        const quest = tab.alert && !active;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "admin-nav-tab",
              active && "admin-nav-tab--active",
              quest && "admin-nav-tab--quest admin-nav-tab--cereri-light",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <AdminHudIcon
              name={tab.icon}
              className="admin-nav-tab__icon h-[18px] w-[18px] shrink-0"
            />
            <span className="admin-nav-tab__label">{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span
                className={[
                  "admin-nav-tab__badge",
                  quest && "admin-nav-tab__badge--quest",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

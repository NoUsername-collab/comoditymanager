"use client";

import { Link, usePathname } from "@/i18n/navigation";
import {
  AdminHudIcon,
  type HudIconName,
} from "@/components/admin/AdminHudIcons";
import { useTranslations } from "next-intl";

type Tab = {
  href: string;
  labelKey:
    | "home"
    | "newRequests"
    | "stays"
    | "clients"
    | "calendar";
  icon: HudIconName;
  alert?: boolean;
  badge?: number;
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
  const t = useTranslations("admin.nav");

  const tabs: Tab[] = [
    {
      href: "/admin/bookings",
      labelKey: "newRequests",
      icon: "inbox",
      alert: cereriCount > 0,
      badge: cereriCount,
    },
    { href: "/admin", labelKey: "home", icon: "home" },
    { href: "/admin/calendar", labelKey: "calendar", icon: "calendar" },
    { href: "/admin/cazari", labelKey: "stays", icon: "bed" },
    { href: "/admin/guests", labelKey: "clients", icon: "person" },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (!tab.locationConfig) return true;
    return locationUnlocked;
  });

  return (
    <nav className="admin-nav admin-hud__nav" aria-label={t("menuAria")}>
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
              className="admin-nav-tab__icon h-[15px] w-[15px] shrink-0"
            />
            <span className="admin-nav-tab__label">{t(tab.labelKey)}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span
                className={[
                  "admin-nav-tab__badge",
                  quest && "admin-nav-tab__badge--quest",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

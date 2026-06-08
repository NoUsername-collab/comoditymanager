"use client";

import { useMemo } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAdminRoutePrefetch } from "@/hooks/useAdminRoutePrefetch";
import { AdminHudIcon } from "@/components/admin/AdminHudIcons";
import {
  ADMIN_PRIMARY_TABS,
  filterAdminTabs,
  isAdminTabActive,
} from "@/layout/mobile";
import { useTranslations } from "next-intl";

export function AdminNav({
  cereriCount,
  locationUnlocked = false,
}: {
  cereriCount: number;
  locationUnlocked?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin.nav");

  const visibleTabs = filterAdminTabs(ADMIN_PRIMARY_TABS, locationUnlocked);
  const prefetchHrefs = useMemo(
    () => visibleTabs.map((tab) => tab.href),
    [visibleTabs]
  );
  useAdminRoutePrefetch(prefetchHrefs);

  return (
    <nav className="admin-nav admin-hud__nav" aria-label={t("menuAria")}>
      {visibleTabs.map((tab) => {
        const active = isAdminTabActive(pathname, tab.href);
        const isBookings = tab.href === "/admin/bookings";
        const badge = isBookings && cereriCount > 0 ? cereriCount : null;
        const quest = badge != null && !active;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={!active}
            onMouseEnter={() => {
              if (!active) router.prefetch(tab.href);
            }}
            onFocus={() => {
              if (!active) router.prefetch(tab.href);
            }}
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
            {badge != null && badge > 0 && (
              <span
                className={[
                  "admin-nav-tab__badge",
                  quest && "admin-nav-tab__badge--quest",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { memo, useMemo, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAdminRoutePrefetch } from "@/hooks/useAdminRoutePrefetch";
import {
  AdminHudIcon,
} from "@/components/admin/AdminHudIcons";
import { useTranslations } from "next-intl";
import {
  ADMIN_PRIMARY_TABS,
  filterAdminTabs,
  isAdminTabActive,
} from "@/layout/mobile";
import { AdminMobileMoreDrawer } from "@/layout/components/AdminMobileMoreDrawer";

export const AdminMobileBottomNav = memo(function AdminMobileBottomNav({
  cereriCount,
  locationUnlocked = false,
}: {
  cereriCount: number;
  locationUnlocked?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin.nav");
  const tabs = filterAdminTabs(ADMIN_PRIMARY_TABS, locationUnlocked);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const prefetchHrefs = useMemo(() => tabs.map((tab) => tab.href), [tabs]);
  useAdminRoutePrefetch(prefetchHrefs);

  return (
    <>
    <nav
      className="ml-bottom-nav ml-bottom-nav--admin"
      aria-label={t("bottomNavAria")}
      data-mobile-chrome="admin-bottom-nav"
    >
      <ul className="ml-bottom-nav__list ml-bottom-nav__list--six">
        {tabs.map((tab) => {
          const active = isAdminTabActive(pathname, tab.href);
          const isBookings = tab.href === "/admin/bookings";
          const badge = isBookings && cereriCount > 0 ? cereriCount : null;

          return (
            <li key={tab.href} className="ml-bottom-nav__item">
              <Link
                href={tab.href}
                prefetch={!active}
                onPointerDown={() => {
                  if (!active) router.prefetch(tab.href);
                }}
                onMouseEnter={() => {
                  if (!active) router.prefetch(tab.href);
                }}
                className={[
                  "ml-bottom-nav__link",
                  active && "ml-bottom-nav__link--active",
                  badge && !active && "ml-bottom-nav__link--alert",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <span className="ml-bottom-nav__icon-wrap">
                  <AdminHudIcon name={tab.icon} className="ml-bottom-nav__icon" />
                  {badge != null ? (
                    <span className="ml-bottom-nav__badge" aria-hidden>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span className="ml-bottom-nav__label">{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
        <li className="ml-bottom-nav__item">
          <button
            ref={moreTriggerRef}
            type="button"
            className="ml-bottom-nav__link ml-bottom-nav__link--more"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
          >
            <span className="ml-bottom-nav__icon-wrap">
              <AdminHudIcon name="grid" className="ml-bottom-nav__icon" />
            </span>
            <span className="ml-bottom-nav__label">{t("more")}</span>
          </button>
        </li>
      </ul>
    </nav>
    <AdminMobileMoreDrawer
      open={moreOpen}
      onClose={() => setMoreOpen(false)}
      locationUnlocked={locationUnlocked}
      triggerRef={moreTriggerRef}
    />
    </>
  );
});

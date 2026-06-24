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
import { hapticTap } from "@/lib/haptic";

export const AdminMobileBottomNav = memo(function AdminMobileBottomNav({
  cereriCount,
  locationUnlocked = false,
  statisticsAccess = false,
}: {
  cereriCount: number;
  locationUnlocked?: boolean;
  statisticsAccess?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin.nav");
  const tabs = filterAdminTabs(ADMIN_PRIMARY_TABS, locationUnlocked);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const prefetchHrefs = useMemo(() => tabs.map((tab) => tab.href), [tabs]);
  useAdminRoutePrefetch(prefetchHrefs);
  function onNavTap() {
    hapticTap(6);
  }

  return (
    <>
    <nav
      className="ml-bottom-nav ml-bottom-nav--admin ml-top-nav"
      aria-label={t("bottomNavAria")}
      data-mobile-chrome="admin-top-nav"
    >
      <ul className="ml-bottom-nav__list">
        {tabs.map((tab) => {
          const active = isAdminTabActive(pathname, tab.href);
          const isCazari = tab.href === "/admin/cazari";
          const badge = isCazari && cereriCount > 0 ? cereriCount : null;
          const ariaLabel =
            badge != null
              ? t("staysPendingAria", { count: badge })
              : undefined;

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
                onClick={onNavTap}
                className={[
                  "ml-bottom-nav__link",
                  active && "ml-bottom-nav__link--active",
                  badge && !active && "ml-bottom-nav__link--alert",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
                aria-label={ariaLabel}
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
            className={[
              "ml-bottom-nav__link",
              "ml-bottom-nav__link--more",
              moreOpen && "ml-bottom-nav__link--active",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label={t("moreMenuAria")}
            onClick={() => {
              hapticTap(6);
              setMoreOpen((open) => !open);
            }}
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
      statisticsAccess={statisticsAccess}
      triggerRef={moreTriggerRef}
    />
    </>
  );
});

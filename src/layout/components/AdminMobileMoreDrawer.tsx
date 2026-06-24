"use client";

import { useId, useMemo, useRef, type RefObject } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAdminRoutePrefetch } from "@/hooks/useAdminRoutePrefetch";
import { AdminHudIcon } from "@/components/admin/AdminHudIcons";
import { useTranslations } from "next-intl";
import {
  ADMIN_MORE_LINKS,
  filterAdminMoreLinks,
} from "@/layout/mobile/admin-more-links";
import { groupAdminMoreLinks } from "@/layout/mobile/admin-more-sections";
import { isAdminTabActive } from "@/layout/mobile/admin-tabs";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { PwaInstallAction } from "@/components/pwa/PwaInstallAction";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";

export function AdminMobileMoreDrawer({
  open,
  onClose,
  locationUnlocked = false,
  statisticsAccess = false,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  locationUnlocked?: boolean;
  statisticsAccess?: boolean;
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const tCommon = useTranslations("common");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const links = filterAdminMoreLinks(ADMIN_MORE_LINKS, {
    locationUnlocked,
    statisticsAccess,
  });
  const sections = groupAdminMoreLinks(links);
  const router = useRouter();
  const prefetchHrefs = useMemo(() => links.map((link) => link.href), [links]);
  useAdminRoutePrefetch(prefetchHrefs);

  useMobileDrawer({ open, onClose, panelRef, triggerRef });

  return (
    <MobileDrawerPortal>
      <button
        type="button"
        className={[
          "ml-drawer__backdrop",
          "ml-drawer__backdrop--admin",
          open && "ml-drawer__backdrop--visible",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={t("moreClose")}
        aria-hidden={!open}
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id={panelId}
        className={[
          "ml-drawer",
          "ml-drawer--admin",
          open && "ml-drawer--open",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label={t("moreMenuAria")}
        hidden={!open}
        suppressHydrationWarning
      >
        <div className="ml-drawer__head">
          <span className="ml-drawer__title">{t("more")}</span>
          <button
            type="button"
            className="ml-drawer__close"
            aria-label={t("moreClose")}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <nav className="ml-drawer__nav">
          <PwaInstallAction variant="drawer" onAfterClick={onClose} />
          {sections.map((section) => (
            <div key={section.id} className="ml-drawer__section">
              <p className="ml-drawer__section-label">{t(section.labelKey)}</p>
              {section.links.map((link) => {
                const active = isAdminTabActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={!active}
                    onPointerDown={() => {
                      if (!active) router.prefetch(link.href);
                    }}
                    onMouseEnter={() => {
                      if (!active) router.prefetch(link.href);
                    }}
                    className={[
                      "ml-drawer__link",
                      active && "ml-drawer__link--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={onClose}
                  >
                    <AdminHudIcon name={link.icon} className="ml-drawer__link-icon" />
                    <span>{t(link.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="ml-drawer__locale">
            <span className="ml-drawer__locale-label">{tCommon("language")}</span>
            <div className="ml-drawer__locale-flags">
              <LanguageSwitcher variant="inline" />
            </div>
          </div>
        </nav>
      </div>
    </MobileDrawerPortal>
  );
}

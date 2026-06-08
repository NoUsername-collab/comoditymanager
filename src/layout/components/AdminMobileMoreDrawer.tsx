"use client";

import { useEffect, useId, useMemo } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAdminRoutePrefetch } from "@/hooks/useAdminRoutePrefetch";
import { AdminHudIcon } from "@/components/admin/AdminHudIcons";
import { useTranslations } from "next-intl";
import {
  ADMIN_MORE_LINKS,
  filterAdminMoreLinks,
} from "@/layout/mobile/admin-more-links";
import { isAdminTabActive } from "@/layout/mobile/admin-tabs";

export function AdminMobileMoreDrawer({
  open,
  onClose,
  locationUnlocked = false,
}: {
  open: boolean;
  onClose: () => void;
  locationUnlocked?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const panelId = useId();
  const links = filterAdminMoreLinks(ADMIN_MORE_LINKS, locationUnlocked);
  const router = useRouter();
  const prefetchHrefs = useMemo(() => links.map((link) => link.href), [links]);
  useAdminRoutePrefetch(prefetchHrefs);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("ml-drawer-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("ml-drawer-open");
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        className={[
          "ml-drawer__backdrop",
          open && "ml-drawer__backdrop--visible",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={t("moreClose")}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <div
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
        <nav className="ml-drawer__nav">
          {links.map((link) => {
            const active = isAdminTabActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={!active}
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
        </nav>
      </div>
    </>
  );
}

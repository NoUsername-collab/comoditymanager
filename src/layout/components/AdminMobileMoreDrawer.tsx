"use client";

import { useEffect, useId } from "react";
import { Link, usePathname } from "@/i18n/navigation";
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

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="ml-drawer__backdrop"
        aria-label={t("moreClose")}
        onClick={onClose}
      />
      <div
        id={panelId}
        className="ml-drawer ml-drawer--admin ml-drawer--open"
        role="dialog"
        aria-modal
        aria-label={t("moreMenuAria")}
      >
        <nav className="ml-drawer__nav">
          {links.map((link) => {
            const active = isAdminTabActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
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

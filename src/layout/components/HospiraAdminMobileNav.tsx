"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { useTranslations } from "next-intl";

const LINKS = [
  { href: "/hospira-admin", labelKey: "dashboard" as const, exact: true },
  { href: "/hospira-admin/tenants", labelKey: "tenants" as const, exact: false },
  { href: "/hospira-admin/logs", labelKey: "logs" as const, exact: false },
  { href: "/hospira-admin/tools", labelKey: "tools" as const, exact: false },
];

export function HospiraAdminMobileNav() {
  const pathname = usePathname();
  const t = useTranslations("hospiraAdmin.nav");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useMobileDrawer({
    open,
    onClose: () => setOpen(false),
    panelRef,
    triggerRef,
  });

  return (
    <div className="ml-mobile-menu ml-mobile-menu--hospira" data-mobile-chrome="hospira-menu">
      <button
        ref={triggerRef}
        type="button"
        className="ml-mobile-menu__trigger ml-mobile-menu__trigger--dark"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? t("menuClose") : t("menuOpen")}</span>
        <span className="ml-mobile-menu__bars" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>

      <MobileDrawerPortal>
        <button
          type="button"
          className={[
            "ml-drawer__backdrop",
            open && "ml-drawer__backdrop--visible",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={t("menuClose")}
          aria-hidden={!open}
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />

        <div
          ref={panelRef}
          id={panelId}
          suppressHydrationWarning
          className={[
            "ml-drawer",
            "ml-drawer--hospira",
            open && "ml-drawer--open",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal={open}
          aria-hidden={!open}
          hidden={!open}
        >
            <div className="ml-drawer__head">
              <button
                type="button"
                className="ml-drawer__close"
                aria-label={t("menuClose")}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="ml-drawer__nav" aria-label={t("menuAria")}>
              {LINKS.map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
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
                    onClick={() => setOpen(false)}
                  >
                    {t(link.labelKey)}
                  </Link>
                );
              })}
            </nav>
        </div>
      </MobileDrawerPortal>
    </div>
  );
}

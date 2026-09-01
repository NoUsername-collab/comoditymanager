"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformMobileMenu() {
  const pathname = usePathname();
  const t = useTranslations("platform.nav");
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
    <div className="ml-mobile-menu ml-mobile-menu--platform" data-mobile-chrome="platform-menu">
      <button
        ref={triggerRef}
        type="button"
        className="ml-mobile-menu__trigger"
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
          className={["ml-drawer", "ml-drawer--platform", open && "ml-drawer--open"]
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
            <Link
              href="/preturi"
              className={[
                "ml-drawer__link",
                isActive(pathname, "/preturi") && "ml-drawer__link--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setOpen(false)}
            >
              {t("pricing")}
            </Link>
            <Link
              href="/admin/login"
              className="ml-drawer__link"
              onClick={() => setOpen(false)}
            >
              {t("login")}
            </Link>
            <Link
              href="/signup"
              className="ml-drawer__link ml-drawer__link--cta platform-header__cta"
              onClick={() => setOpen(false)}
            >
              {t("signup")}
            </Link>
            <div className="ml-drawer__locale">
              <HeaderLocaleSwitch slot="drawer" />
            </div>
          </nav>
        </div>
      </MobileDrawerPortal>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicMobileMenu() {
  const pathname = usePathname();
  const t = useTranslations("public.nav");
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
    <div className="ml-mobile-menu" data-mobile-chrome="public-menu">
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
          className={["ml-drawer", open && "ml-drawer--open"].filter(Boolean).join(" ")}
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
                href="/"
                className={[
                  "ml-drawer__link",
                  isActive(pathname, "/") && "ml-drawer__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setOpen(false)}
              >
                {t("home")}
              </Link>
              <Link
                href="/confidentialitate"
                className={[
                  "ml-drawer__link",
                  isActive(pathname, "/confidentialitate") && "ml-drawer__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setOpen(false)}
              >
                {t("gdpr")}
              </Link>
              <Link
                href="/termeni"
                className={[
                  "ml-drawer__link",
                  isActive(pathname, "/termeni") && "ml-drawer__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setOpen(false)}
              >
                {t("terms")}
              </Link>
              <Link
                href="/calendar"
                className="ml-drawer__link ml-drawer__link--cta site-cta"
                onClick={() => setOpen(false)}
              >
                {t("book")}
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

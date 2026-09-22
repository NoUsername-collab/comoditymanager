"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { useOptionalPublicSiteConfig } from "@/features/public-site/PublicSiteConfigProvider";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import { useLocale, useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicMobileMenu() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("public.nav");
  const config = useOptionalPublicSiteConfig();
  const items = resolvePublicNavItems(config, locale, {
    home: t("home"),
    privacy: t("gdpr"),
    terms: t("terms"),
    book: t("book"),
  });
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
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={[
                    "ml-drawer__link",
                    item.cta && "ml-drawer__link--cta site-cta",
                    isActive(pathname, item.href) && "ml-drawer__link--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="ml-drawer__locale">
                <HeaderLocaleSwitch slot="drawer" />
              </div>
            </nav>
        </div>
      </MobileDrawerPortal>
    </div>
  );
}

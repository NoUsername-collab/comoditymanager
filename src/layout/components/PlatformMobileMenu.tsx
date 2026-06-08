"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("ml-drawer-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("ml-drawer-open");
    };
  }, [open]);

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

      {open ? (
        <button
          type="button"
          className="ml-drawer__backdrop"
          aria-label={t("menuClose")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        id={panelId}
        className={["ml-drawer", "ml-drawer--platform", open && "ml-drawer--open"]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        hidden={!open}
      >
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
            <LanguageSwitcher />
          </div>
        </nav>
      </div>
    </div>
  );
}

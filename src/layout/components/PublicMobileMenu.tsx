"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicMobileMenu() {
  const pathname = usePathname();
  const t = useTranslations("public.nav");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="ml-mobile-menu" data-mobile-chrome="public-menu">
      <button
        ref={triggerRef}
        type="button"
        className="ml-mobile-menu__trigger"
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? t("menuClose") : t("menuOpen")}</span>
        <span className="ml-mobile-menu__bars" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>

      {mounted ? (
        <>
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
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
          />

          <div
            id={panelId}
            suppressHydrationWarning
            className={["ml-drawer", open && "ml-drawer--open"].filter(Boolean).join(" ")}
            role="dialog"
            aria-modal={open}
            aria-hidden={!open}
            hidden={!open}
          >
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
        </>
      ) : null}
    </div>
  );
}

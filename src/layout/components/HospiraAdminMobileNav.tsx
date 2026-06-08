"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const LINKS = [
  { href: "/hospira-admin", labelKey: "dashboard" as const, exact: true },
  { href: "/hospira-admin/tenants", labelKey: "tenants" as const, exact: false },
  { href: "/hospira-admin/logs", labelKey: "logs" as const, exact: false },
];

export function HospiraAdminMobileNav() {
  const pathname = usePathname();
  const t = useTranslations("hospiraAdmin.nav");
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
    </div>
  );
}

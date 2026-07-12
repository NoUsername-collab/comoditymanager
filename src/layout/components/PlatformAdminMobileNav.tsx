"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { useTranslations } from "next-intl";

const LINKS = [
  { href: "/platform-admin", labelKey: "dashboard" as const, exact: true },
  { href: "/platform-admin/tenants", labelKey: "tenants" as const, exact: false },
  { href: "/platform-admin/logs", labelKey: "logs" as const, exact: false },
  { href: "/platform-admin/tools", labelKey: "tools" as const, exact: false },
];

export function PlatformAdminMobileNav() {
  const pathname = usePathname();
  const t = useTranslations("platformAdmin.nav");
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
        className={[
          "ml-mobile-menu__trigger",
          "inline-flex min-h-[var(--ml-touch-min)] min-w-[var(--ml-touch-min)] items-center justify-center",
          "rounded-[0.65rem] border border-neutral-600 bg-neutral-800 text-neutral-50",
          "touch-manipulation [-webkit-tap-highlight-color:transparent]",
        ].join(" ")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? t("menuClose") : t("menuOpen")}</span>
        <span
          className="ml-mobile-menu__bars flex w-[1.1rem] flex-col gap-[0.22rem]"
          aria-hidden
        >
          <span className="block h-0.5 rounded-[1px] bg-current" />
          <span className="block h-0.5 rounded-[1px] bg-current" />
          <span className="block h-0.5 rounded-[1px] bg-current" />
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
            "ml-drawer--platform",
            "border-r-neutral-700 bg-neutral-900 text-neutral-100",
            open && "ml-drawer--open",
          ]
            .filter(Boolean)
            .join(" ")}
          role="dialog"
          aria-modal={open}
          aria-hidden={!open}
          hidden={!open}
        >
            <div className="ml-drawer__head mb-1.5 flex shrink-0 items-center justify-end">
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
                      "ml-drawer__link text-neutral-200",
                      active && "ml-drawer__link--active bg-white/12",
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

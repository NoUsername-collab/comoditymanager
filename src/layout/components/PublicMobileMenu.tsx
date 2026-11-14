"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { MobileDrawerPortal } from "@/layout/mobile/MobileDrawerPortal";
import { useMobileDrawer } from "@/layout/mobile/use-mobile-drawer";
import { isNavItemActive, type PublicNavItem } from "@/features/public-site/domain/nav-items";
import { PublicNavLink } from "@/features/public-site/ui/PublicNav";
import { useTranslations } from "next-intl";

export function PublicMobileMenu({
  items,
  themeClassName,
  themeStyle,
}: {
  items: PublicNavItem[];
  /**
   * The site's theme: the drawer is drawn on the page's body, outside the
   * element that carries the site's colours, so it takes them along.
   */
  themeClassName: string;
  themeStyle: CSSProperties;
}) {
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
        {/* No box of its own: only the colours and fonts reach the backdrop and the drawer. */}
        <div className={themeClassName} style={{ ...themeStyle, display: "contents" }}>
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
                  <div key={item.key} className="ml-drawer__item">
                    {item.href ? (
                      <PublicNavLink
                        item={{ ...item, href: item.href }}
                        className={[
                          "ml-drawer__link",
                          item.cta && "ml-drawer__link--cta site-cta",
                          isNavItemActive(pathname, item.href) && "ml-drawer__link--active",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setOpen(false)}
                      />
                    ) : (
                      <span className="ml-drawer__link ml-drawer__group">{item.label}</span>
                    )}
                    {/* A submenu is shown open, set in under its item: a drawer has room. */}
                    {item.children?.map((child) =>
                      child.href ? (
                        <PublicNavLink
                          key={child.key}
                          item={{ ...child, href: child.href }}
                          className={[
                            "ml-drawer__link ml-drawer__sublink",
                            isNavItemActive(pathname, child.href) && "ml-drawer__link--active",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setOpen(false)}
                        />
                      ) : null,
                    )}
                  </div>
                ))}
                <div className="ml-drawer__locale">
                  <HeaderLocaleSwitch slot="drawer" />
                </div>
              </nav>
          </div>
        </div>
      </MobileDrawerPortal>
    </div>
  );
}

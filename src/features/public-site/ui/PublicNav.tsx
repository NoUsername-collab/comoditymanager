"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavItemActive, type PublicNavItem } from "@/features/public-site/domain/nav-items";
import { useTranslations } from "next-intl";

/** A menu link: inside the site through the locale-aware Link, elsewhere as a plain link opening apart. */
export function PublicNavLink({
  item,
  className,
  onClick,
}: {
  item: PublicNavItem & { href: string };
  className: string;
  onClick?: () => void;
}) {
  if (item.external) {
    return (
      <a href={item.href} className={className} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}

/** Links come resolved from the server, so the site config never reaches the browser. */
export function PublicNav({ items }: { items: PublicNavItem[] }) {
  const pathname = usePathname();
  const t = useTranslations("public.nav");
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => setOpen(null), [pathname]);

  // A submenu closes on Escape and on a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    const onClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const linkClass = (item: PublicNavItem) =>
    [
      "public-header__link",
      item.cta && "public-header__cta site-cta",
      isNavItemActive(pathname, item.href) && "public-header__link--active",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <nav ref={navRef} className="public-header__nav" aria-label={t("mainAria")}>
      {items.map((item) => {
        if (!item.children?.length) {
          return item.href ? (
            <PublicNavLink key={item.key} item={{ ...item, href: item.href }} className={linkClass(item)} />
          ) : null;
        }
        const expanded = open === item.key;
        const childActive = item.children.some((child) => isNavItemActive(pathname, child.href));
        return (
          <div
            key={item.key}
            className="public-header__group"
            data-open={expanded ? "1" : undefined}
            onMouseEnter={() => setOpen(item.key)}
            onMouseLeave={() => setOpen((current) => (current === item.key ? null : current))}
          >
            {item.href ? (
              <PublicNavLink item={{ ...item, href: item.href }} className={linkClass(item)} />
            ) : null}
            <button
              type="button"
              className={[
                "public-header__link public-header__toggle",
                childActive && "public-header__link--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-expanded={expanded}
              aria-label={item.href ? t("submenu", { name: item.label }) : undefined}
              onClick={() => setOpen(expanded ? null : item.key)}
            >
              {item.href ? null : item.label}
              <span className="public-header__caret" aria-hidden>
                ▾
              </span>
            </button>
            <ul className="public-header__submenu" hidden={!expanded}>
              {item.children.map((child) =>
                child.href ? (
                  <li key={child.key}>
                    <PublicNavLink
                      item={{ ...child, href: child.href }}
                      className={[
                        "public-header__sublink",
                        isNavItemActive(pathname, child.href) && "public-header__sublink--active",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setOpen(null)}
                    />
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

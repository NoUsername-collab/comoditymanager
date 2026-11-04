"use client";

import { Link, usePathname } from "@/i18n/navigation";
import type { PublicNavItem } from "@/features/public-site/domain/nav-items";
import { useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

/** Links come resolved from the server, so the site config never reaches the browser. */
export function PublicNav({ items }: { items: PublicNavItem[] }) {
  const pathname = usePathname();
  const t = useTranslations("public.nav");

  return (
    <nav className="public-header__nav" aria-label={t("mainAria")}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={[
            "public-header__link",
            item.cta && "public-header__cta site-cta",
            isActive(pathname, item.href) && "public-header__link--active",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

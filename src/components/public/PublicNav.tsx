"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicNav() {
  const pathname = usePathname();
  const t = useTranslations("public.nav");

  return (
    <nav className="public-header__nav" aria-label={t("mainAria")}>
      <Link
        href="/"
        className={[
          "public-header__link",
          isActive(pathname, "/") && "public-header__link--active",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {t("home")}
      </Link>
      <Link
        href="/confidentialitate"
        className={[
          "public-header__link",
          isActive(pathname, "/confidentialitate") &&
            "public-header__link--active",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {t("gdpr")}
      </Link>
      <Link href="/calendar" className="public-header__link public-header__cta site-cta">
        {t("book")}
      </Link>
    </nav>
  );
}

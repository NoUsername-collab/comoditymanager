"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useOptionalPublicSiteConfig } from "@/features/public-site/PublicSiteConfigProvider";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import { useLocale, useTranslations } from "next-intl";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicNav() {
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

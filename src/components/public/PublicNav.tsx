"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function PublicNav() {
  const pathname = usePathname();

  return (
    <nav className="public-header__nav" aria-label="Navigare principală">
      <Link
        href="/"
        className={[
          "public-header__link",
          isActive(pathname, "/") && "public-header__link--active",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        Acasă
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
        GDPR
      </Link>
      <Link href="/calendar" className="public-header__link public-header__cta site-cta">
        Rezervare
      </Link>
    </nav>
  );
}

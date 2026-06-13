"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { guestAppHomeHref } from "@/domain/guest-app/routes";
import type { GuestAppFeatureDef } from "@/domain/guest-app/types";
import { GuestNavIcon } from "@/features/guest-app/icons";
import {
  buildGuestBottomNav,
  guestNavLabelKey,
  resolveActiveGuestNavTab,
} from "./nav";

type Props = {
  accessCode: string;
  features: GuestAppFeatureDef[];
};

export function GuestAppBottomNav({ accessCode, features }: Props) {
  const t = useTranslations("guestApp");
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const tabs = buildGuestBottomNav(accessCode, features);
  const active = resolveActiveGuestNavTab(pathname, accessCode);
  const homeHref = guestAppHomeHref(accessCode);
  const onHome = active === "home";

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function handleMenuClick(event: MouseEvent<HTMLAnchorElement>, tabId: string) {
    if (tabId !== "menu" || !onHome) return;
    event.preventDefault();
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${homeHref}#features`);
    setHash("#features");
  }

  return (
    <nav className="guest-app__bottom-nav" aria-label={t("shell.navLabel")}>
      <ul
        className="guest-app__bottom-nav__list"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.id === "menu" ? onHome && hash === "#features" : tab.id === active;
          const label = t(guestNavLabelKey(tab) as "nav.home");

          return (
            <li key={tab.id} className="guest-app__bottom-nav__item">
              <Link
                href={tab.href}
                onClick={(event) => handleMenuClick(event, tab.id)}
                className={[
                  "guest-app__bottom-nav__link",
                  isActive && "guest-app__bottom-nav__link--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <GuestNavIcon id={tab.id} className="guest-app__bottom-nav__svg" />
                <span className="guest-app__bottom-nav__label">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

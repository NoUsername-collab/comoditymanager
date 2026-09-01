"use client";

import { Link } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { PlatformMobileMenu } from "@/layout/components/PlatformMobileMenu";

type PlatformHeaderLabels = {
  pricing: string;
  login: string;
  signup: string;
};

export function PlatformHeaderChrome({ labels }: { labels: PlatformHeaderLabels }) {
  return (
    <div className="platform-header__inner">
      <Link href="/landing" className="platform-header__brand">
        <span className="platform-header__logo" aria-hidden>
          <svg
            className="platform-header__mark"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="32" height="32" rx="7" fill="currentColor" />
            <path
              d="M9.5 10h13M9.5 22h13M22.5 10 9.5 22"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="square"
            />
          </svg>
        </span>
        <span className="platform-header__name">Zalmox</span>
      </Link>

      <PlatformMobileMenu />
      <nav className="platform-header__nav">
        <Link href="/preturi" className="platform-header__link">
          {labels.pricing}
        </Link>
        <Link href="/admin/login" className="platform-header__link">
          {labels.login}
        </Link>
        <Link href="/signup" className="platform-header__cta">
          {labels.signup}
        </Link>
        <HeaderLocaleSwitch slot="nav" suppressHydrationWarning />
      </nav>
    </div>
  );
}

"use client";

import { Link } from "@/i18n/navigation";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { PlatformMobileMenu } from "@/layout/components/PlatformMobileMenu";

type PlatformHeaderLabels = {
  pricing: string;
  gdpr: string;
  login: string;
  signup: string;
};

export function PlatformHeaderChrome({ labels }: { labels: PlatformHeaderLabels }) {
  return (
    <div className="platform-header__inner">
      <Link href="/landing" className="platform-header__brand">
        <span className="platform-header__logo">H</span>
        <span className="platform-header__name">Hospira</span>
      </Link>

      <PlatformMobileMenu />
      <nav className="platform-header__nav">
        <Link href="/preturi" className="platform-header__link">
          {labels.pricing}
        </Link>
        <Link href="/confidentialitate" className="platform-header__link">
          {labels.gdpr}
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

import { BrandLogo } from "./BrandLogo";
import { PublicNav } from "./PublicNav";
import { PublicTenantLogo } from "./PublicTenantLogo";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { PublicMobileMenu } from "@/layout/components/PublicMobileMenu";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { pickLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { getLocale, getTranslations } from "next-intl/server";

export async function PublicHeader({ config }: { config: PublicSiteConfig }) {
  const [t, locale] = await Promise.all([
    getTranslations("public.header"),
    getLocale(),
  ]);
  const subtitle = pickLocalized(config.chrome.headerSubtitle, locale, [t("subtitle")]);

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <StaffLogoEntry className="public-header__brand group cursor-pointer">
          <PublicTenantLogo logoUrl={config.chrome.logoUrl} displayName={config.displayName}>
            <BrandLogo animated priority />
          </PublicTenantLogo>
          <div className="min-w-0 leading-tight">
            <span className="public-header__name">{config.displayName}</span>
            {subtitle ? <span className="public-header__tag">{subtitle}</span> : null}
          </div>
        </StaffLogoEntry>
        <div className="flex items-center gap-2 sm:gap-3">
          <PublicMobileMenu />
          <PublicNav />
          <HeaderLocaleSwitch slot="nav" />
        </div>
      </div>
    </header>
  );
}

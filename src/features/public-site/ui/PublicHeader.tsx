import { BrandLogo } from "./BrandLogo";
import { PublicNav } from "./PublicNav";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { PublicMobileMenu } from "@/layout/components/PublicMobileMenu";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { getTranslations } from "next-intl/server";

export async function PublicHeader({ config }: { config: PublicSiteConfig }) {
  const [t] = await Promise.all([getTranslations("public.header")]);

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <StaffLogoEntry className="public-header__brand group cursor-pointer">
          <BrandLogo animated priority />
          <div className="min-w-0 leading-tight">
            <span className="public-header__name">{config.displayName}</span>
            <span className="public-header__tag">{t("subtitle")}</span>
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

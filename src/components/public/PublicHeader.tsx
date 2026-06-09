import { BrandLogo } from "./BrandLogo";
import { PublicNav } from "./PublicNav";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { PublicMobileMenu } from "@/layout/components/PublicMobileMenu";
import { HeaderLocaleSwitch } from "@/layout/components/HeaderLocaleSwitch";
import { getPublicPensionDisplayName } from "@/services/public-brand";
import { getTranslations } from "next-intl/server";

export async function PublicHeader() {
  const shellPromise = getTranslations("public.shell");
  const [t, tShell, title] = await Promise.all([
    getTranslations("public.header"),
    shellPromise,
    shellPromise.then((ts) => getPublicPensionDisplayName(ts("brandFallback"))),
  ]);

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <StaffLogoEntry className="public-header__brand group cursor-pointer">
          <BrandLogo animated priority />
          <div className="min-w-0 leading-tight">
            <span className="public-header__name">{title}</span>
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

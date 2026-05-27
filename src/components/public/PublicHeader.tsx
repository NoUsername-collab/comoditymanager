import { Link } from "@/i18n/navigation";
import { BrandLogo } from "./BrandLogo";
import { PublicNav } from "./PublicNav";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getPensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

export async function PublicHeader() {
  const t = await getTranslations("public.header");
  const tShell = await getTranslations("public.shell");
  let title = tShell("brandFallback");

  try {
    const s = await getPensionSettings();
    if (s?.display_name) title = s.display_name;
  } catch {
    /* fără DB */
  }

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <StaffLogoEntry>
          <Link href="/" className="public-header__brand group">
            <BrandLogo animated />
            <div className="min-w-0 leading-tight">
              <span className="public-header__name">{title}</span>
              <span className="public-header__tag">{t("subtitle")}</span>
            </div>
          </Link>
        </StaffLogoEntry>
        <div className="flex items-center gap-3">
          <PublicNav />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

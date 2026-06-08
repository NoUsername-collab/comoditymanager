import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { PlatformMobileMenu } from "@/layout/components/PlatformMobileMenu";
import { getTranslations } from "next-intl/server";

export async function PlatformHeader({
  variant = "dark",
}: {
  variant?: "dark" | "split";
}) {
  const t = await getTranslations("platform.header");

  return (
    <header
      className={`platform-header${variant === "split" ? " platform-header--split" : ""}`}
    >
      <div className="platform-header__inner">
        <Link href="/landing" className="platform-header__brand">
          <span className="platform-header__logo">H</span>
          <span className="platform-header__name">Hospira</span>
        </Link>

        <PlatformMobileMenu />
        <nav className="platform-header__nav">
          <Link href="/preturi" className="platform-header__link">
            {t("pricing")}
          </Link>
          <Link href="/confidentialitate" className="platform-header__link">
            {t("gdpr")}
          </Link>
          <Link href="/admin/login" className="platform-header__link">
            {t("login")}
          </Link>
          <Link href="/signup" className="platform-header__cta">
            {t("signup")}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}

import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { getTranslations } from "next-intl/server";

export async function PlatformHeader() {
  const t = await getTranslations("platform.header");

  return (
    <header className="platform-header">
      <div className="platform-header__inner">
        <Link href="/landing" className="platform-header__brand">
          <span className="platform-header__logo">H</span>
          <span className="platform-header__name">Hospira</span>
        </Link>

        <nav className="platform-header__nav">
          <a href="#preturi" className="platform-header__link">
            {t("pricing")}
          </a>
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

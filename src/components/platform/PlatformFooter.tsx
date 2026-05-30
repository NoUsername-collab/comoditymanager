import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function PlatformFooter() {
  const t = await getTranslations("platform.footer");

  return (
    <footer className="platform-footer">
      <div className="platform-footer__inner">
        <div className="platform-footer__grid">
          <div>
            <p className="platform-footer__brand">Hospira</p>
            <p className="platform-footer__desc">{t("tagline")}</p>
          </div>

          <div>
            <p className="platform-footer__label">{t("product")}</p>
            <nav className="platform-footer__links">
              <a href="#preturi">{t("pricing")}</a>
              <Link href="/signup">{t("signup")}</Link>
              <Link href="/admin/login">{t("login")}</Link>
            </nav>
          </div>

          <div>
            <p className="platform-footer__label">{t("legal")}</p>
            <nav className="platform-footer__links">
              <Link href="/termeni">{t("terms")}</Link>
              <Link href="/confidentialitate">{t("privacy")}</Link>
            </nav>
          </div>

          <div>
            <p className="platform-footer__label">{t("contact")}</p>
            <p className="platform-footer__contact">
              <a href="mailto:contact@hospira.ro">contact@hospira.ro</a>
            </p>
          </div>
        </div>

        <div className="platform-footer__bottom">
          <p>&copy; {new Date().getFullYear()} Hospira. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}

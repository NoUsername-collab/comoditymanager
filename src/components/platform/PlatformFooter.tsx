import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  PLATFORM_CONTACT_EMAIL,
  PLATFORM_NAME,
} from "@/lib/platform/branding";

export async function PlatformFooter() {
  const t = await getTranslations("platform.footer");

  return (
    <footer className="platform-footer">
      <div className="platform-footer__inner">
        <div className="platform-footer__grid">
          <div>
            <p className="platform-footer__brand">{PLATFORM_NAME}</p>
            <p className="platform-footer__desc">{t("tagline")}</p>
          </div>

          <div>
            <p className="platform-footer__label">{t("product")}</p>
            <nav className="platform-footer__links">
              <Link href="/preturi">{t("pricing")}</Link>
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
              <a href={`mailto:${PLATFORM_CONTACT_EMAIL}`}>
                {PLATFORM_CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>

        <div className="platform-footer__bottom">
          <p>&copy; {new Date().getFullYear()} {PLATFORM_NAME}. {t("rights")}</p>
        </div>
      </div>
    </footer>
  );
}

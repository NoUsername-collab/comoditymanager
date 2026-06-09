import { Link } from "@/i18n/navigation";
import { getPublicPensionDisplayName } from "@/services/public-brand";
import { getTranslations } from "next-intl/server";

export async function PublicFooter() {
  const shellPromise = getTranslations("public.shell");
  const [t, tShell, title] = await Promise.all([
    getTranslations("public.footer"),
    shellPromise,
    shellPromise.then((ts) => getPublicPensionDisplayName(ts("brandFallback"))),
  ]);

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div>
            <p className="public-footer__brand-name">{title}</p>
            <p className="public-footer__brand-desc">{t("tagline")}</p>
          </div>

          <div>
            <p className="public-footer__label">{t("links")}</p>
            <nav className="public-footer__links">
              <Link href="/calendar">{t("bookingRequest")}</Link>
              <Link href="/termeni">{t("terms")}</Link>
              <Link href="/confidentialitate">{t("privacy")}</Link>
            </nav>
          </div>

          <div>
            <p className="public-footer__label">{t("contact")}</p>
            <p className="public-footer__contact">
              <a href={`mailto:${t("contactEmail")}`}>{t("contactEmail")}</a>
            </p>
          </div>
        </div>

        <p className="public-footer__bottom">
          {t("copyright", { year: new Date().getFullYear(), name: title })}
        </p>
      </div>
    </footer>
  );
}

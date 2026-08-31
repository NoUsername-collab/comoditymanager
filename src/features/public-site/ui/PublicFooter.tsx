import { Link } from "@/i18n/navigation";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { getTranslations } from "next-intl/server";

export async function PublicFooter({ config }: { config: PublicSiteConfig }) {
  const [t] = await Promise.all([getTranslations("public.footer")]);

  const contactLinks = buildPublicContactLinks(config.contact);
  const showBookingLink =
    config.bookingEnabled &&
    (config.bookingNavPosition === "footer" || config.bookingNavPosition === "both");

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div>
            <p className="public-footer__brand-name">{config.displayName}</p>
            <p className="public-footer__brand-desc">{t("tagline")}</p>
          </div>

          <div>
            <p className="public-footer__label">{t("links")}</p>
            <nav className="public-footer__links">
              {showBookingLink ? <Link href="/calendar">{t("bookingRequest")}</Link> : null}
              <Link href="/termeni">{t("terms")}</Link>
              <Link href="/confidentialitate">{t("privacy")}</Link>
            </nav>
          </div>

          <div>
            <p className="public-footer__label">{t("contact")}</p>
            {contactLinks.length > 0 ? (
              <div className="public-footer__contact-links">
                {contactLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : (
              <p className="public-footer__contact public-footer__contact--muted">
                {t("contactNotConfigured")}
              </p>
            )}
          </div>
        </div>

        <p className="public-footer__bottom">
          {t("copyright", { year: new Date().getFullYear(), name: config.displayName })}
        </p>
      </div>
    </footer>
  );
}

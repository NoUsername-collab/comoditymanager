import { Link } from "@/i18n/navigation";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import { pickLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { getLocale, getTranslations } from "next-intl/server";

export async function PublicFooter({ config }: { config: PublicSiteConfig }) {
  const [t, tContact, locale] = await Promise.all([
    getTranslations("public.footer"),
    getTranslations("public.contact"),
    getLocale(),
  ]);

  const contactLinks = buildPublicContactLinks(config.contact, {
    email: tContact("email"),
    whatsapp: tContact("whatsapp"),
    telegram: tContact("telegram"),
    facebook: tContact("facebook"),
    instagram: tContact("instagram"),
  });
  const showBookingLink =
    config.published !== false &&
    config.bookingEnabled &&
    (config.bookingNavPosition === "footer" || config.bookingNavPosition === "both");
  const tagline = pickLocalized(config.chrome.footerTagline, locale, [t("tagline")]);
  const termsLabel = pickLocalized(config.chrome.navTerms, locale, [t("terms")]);
  const privacyLabel = pickLocalized(config.chrome.navPrivacy, locale, [t("privacy")]);

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div>
            <p className="public-footer__brand-name">{config.displayName}</p>
            <p className="public-footer__brand-desc">{tagline}</p>
          </div>

          <div>
            <p className="public-footer__label">{t("links")}</p>
            <nav className="public-footer__links">
              {showBookingLink ? <Link href="/calendar">{t("bookingRequest")}</Link> : null}
              <Link href="/termeni">{termsLabel}</Link>
              <Link href="/confidentialitate">{privacyLabel}</Link>
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

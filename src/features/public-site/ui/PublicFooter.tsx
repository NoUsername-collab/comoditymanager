import { Link } from "@/i18n/navigation";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { useTranslations } from "next-intl";

/**
 * The site footer, live and in the settings preview. `locale` picks the
 * operator's copy; `preview` draws links as plain text so nothing navigates.
 */
export function PublicFooter({
  config,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  const t = useTranslations("public.footer");
  const tContact = useTranslations("public.contact");

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
  const tagline = pickOwnLocalized(config.chrome.footerTagline, locale);
  const termsLabel = pickOwnLocalized(config.chrome.navTerms, locale);
  const privacyLabel = pickOwnLocalized(config.chrome.navPrivacy, locale);
  const footerLinks = [
    showBookingLink ? { href: "/calendar", label: t("bookingRequest") } : null,
    termsLabel ? { href: "/termeni", label: termsLabel } : null,
    privacyLabel ? { href: "/confidentialitate", label: privacyLabel } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div>
            <p className="public-footer__brand-name">{config.displayName}</p>
            {tagline ? <p className="public-footer__brand-desc">{tagline}</p> : null}
          </div>

          {footerLinks.length > 0 ? (
            <div>
              <p className="public-footer__label">{t("links")}</p>
              <nav className="public-footer__links">
                {footerLinks.map((link) =>
                  preview ? (
                    <span key={link.href}>{link.label}</span>
                  ) : (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
          ) : null}

          {/* Without any contact the column is left out — visitors never see setup hints. */}
          {contactLinks.length > 0 ? (
            <div>
              <p className="public-footer__label">{t("contact")}</p>
              <div className="public-footer__contact-links">
                {contactLinks.map((link) =>
                  preview ? (
                    <span key={link.id}>{link.label}</span>
                  ) : (
                    <a
                      key={link.id}
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                    </a>
                  ),
                )}
              </div>
            </div>
          ) : null}
        </div>

        <p className="public-footer__bottom">
          {t("copyright", { year: new Date().getFullYear(), name: config.displayName })}
        </p>
      </div>
    </footer>
  );
}

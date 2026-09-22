"use client";

import { useTranslations } from "next-intl";
import { BrandMarkSvg } from "@/features/public-site/ui/BrandMarkSvg";
import {
  buildPublicContactLinks,
  PublicContactBar,
} from "@/features/public-site/contact/PublicContactBar";
import { PublicSiteConfigProvider } from "@/features/public-site/PublicSiteConfigProvider";
import { PublicSiteBody } from "@/features/public-site/templates/PublicSiteTemplates";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";

export function PublicSitePreview({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const tHeader = useTranslations("public.header");
  const tNav = useTranslations("public.nav");
  const tFooter = useTranslations("public.footer");
  const tHome = useTranslations("public.home");

  const checkTimesLabel = tHome("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });

  const showBookingNav =
    config.bookingEnabled &&
    (config.bookingNavPosition === "nav" || config.bookingNavPosition === "both");
  const showBookingFooter =
    config.bookingEnabled &&
    (config.bookingNavPosition === "footer" || config.bookingNavPosition === "both");
  const contactLinks = buildPublicContactLinks(config.contact);

  return (
    <PublicSiteConfigProvider config={config}>
      <div
        className={["settings-public-preview", "pub-site", publicThemeClassName(config.themeId)].join(
          " ",
        )}
        style={resolvePublicThemeStyle(config.themeId)}
      >
        <header className="public-header">
          <div className="public-header__inner">
            <div className="public-header__brand">
              <BrandMarkSvg animated={false} className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
              <div className="min-w-0 leading-tight">
                <span className="public-header__name">{config.displayName}</span>
                <span className="public-header__tag">{tHeader("subtitle")}</span>
              </div>
            </div>
            <nav className="public-header__nav" aria-hidden>
              <span className="public-header__link public-header__link--active">{tNav("home")}</span>
              <span className="public-header__link">{tNav("gdpr")}</span>
              {showBookingNav ? (
                <span className="public-header__link public-header__cta site-cta">{tNav("book")}</span>
              ) : null}
            </nav>
          </div>
        </header>

        <PublicSiteBody
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
          preview
        />

        <PublicContactBar
          contact={config.contact}
          title={tFooter("contact")}
          emptyHint={tFooter("contactEmptyHint")}
        />

        <footer className="public-footer">
          <div className="public-footer__inner">
            <div className="public-footer__grid">
              <div>
                <p className="public-footer__brand-name">{config.displayName}</p>
                <p className="public-footer__brand-desc">{tFooter("tagline")}</p>
              </div>
              <div>
                <p className="public-footer__label">{tFooter("links")}</p>
                <nav className="public-footer__links">
                  {showBookingFooter ? <span>{tFooter("bookingRequest")}</span> : null}
                  <span>{tFooter("terms")}</span>
                  <span>{tFooter("privacy")}</span>
                </nav>
              </div>
              <div>
                <p className="public-footer__label">{tFooter("contact")}</p>
                {contactLinks.length > 0 ? (
                  <div className="public-footer__contact-links">
                    {contactLinks.map((link) => (
                      <span key={link.id}>{link.label}</span>
                    ))}
                  </div>
                ) : (
                  <p className="public-footer__contact public-footer__contact--muted">
                    {tFooter("contactNotConfigured")}
                  </p>
                )}
              </div>
            </div>
            <p className="public-footer__bottom">
              {tFooter("copyright", {
                year: new Date().getFullYear(),
                name: config.displayName,
              })}
            </p>
          </div>
        </footer>
      </div>
    </PublicSiteConfigProvider>
  );
}

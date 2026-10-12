"use client";

import { useLocale, useTranslations } from "next-intl";
import { PublicTenantLogo } from "@/features/public-site/ui/PublicTenantLogo";
import {
  buildPublicContactLinks,
  PublicContactBar,
} from "@/features/public-site/contact/PublicContactBar";
import { publicChromeFontStack } from "@/features/public-site/domain/chrome";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import { PublicSiteConfigProvider } from "@/features/public-site/PublicSiteConfigProvider";
import { PublicSiteBody } from "@/features/public-site/templates/PublicSiteTemplates";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import type { CSSProperties } from "react";
import "@/styles/features/public/public-site.css";
import "@/styles/features/public/public-site-v2.css";
import "@/styles/features/public/public-site-layouts.css";

export function PublicSitePreview({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const tFooter = useTranslations("public.footer");
  const tHome = useTranslations("public.home");
  const tContact = useTranslations("public.contact");
  const activeLocale = useLocale();
  const previewLocale = locale || activeLocale;

  const checkTimesLabel = tHome("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });

  const navItems = resolvePublicNavItems(config, previewLocale);
  const showBookingFooter =
    config.published !== false &&
    config.bookingEnabled &&
    (config.bookingNavPosition === "footer" || config.bookingNavPosition === "both");
  const contactLinks = buildPublicContactLinks(config.contact, {
    email: tContact("email"),
    whatsapp: tContact("whatsapp"),
    telegram: tContact("telegram"),
    facebook: tContact("facebook"),
    instagram: tContact("instagram"),
  });
  const subtitle = pickOwnLocalized(config.chrome.headerSubtitle, previewLocale);
  const tagline = pickOwnLocalized(config.chrome.footerTagline, previewLocale);
  const termsLabel = pickOwnLocalized(config.chrome.navTerms, previewLocale);
  const privacyLabel = pickOwnLocalized(config.chrome.navPrivacy, previewLocale);
  const themeStyle = resolvePublicThemeStyle(config.themeId);
  const fontStack = publicChromeFontStack(config.chrome.fontId);
  const style = (
    fontStack
      ? { ...themeStyle, "--pub-font-display": fontStack, "--public-font-serif": fontStack }
      : themeStyle
  ) as CSSProperties;

  return (
    <PublicSiteConfigProvider config={config}>
      <div
        className={["settings-public-preview", "pub-site", publicThemeClassName(config.themeId)].join(
          " ",
        )}
        style={style}
        data-pub-template={config.templateId}
      >
        <header className="public-header">
          <div className="public-header__inner">
            <div className="public-header__brand">
              <PublicTenantLogo logoUrl={config.chrome.logoUrl} displayName={config.displayName} />
              <div className="min-w-0 leading-tight">
                <span className="public-header__name">{config.displayName}</span>
                {subtitle ? <span className="public-header__tag">{subtitle}</span> : null}
              </div>
            </div>
            <nav className="public-header__nav" aria-hidden>
              {navItems.map((item) => (
                <span
                  key={item.key}
                  className={[
                    "public-header__link",
                    item.cta && "public-header__cta site-cta",
                    item.key === "home" && "public-header__link--active",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          </div>
        </header>

        <PublicSiteBody
          config={config}
          locale={previewLocale}
          checkTimesLabel={checkTimesLabel}
          preview
        />

        {config.chrome.showContactBar !== false ? (
          <PublicContactBar
            contact={config.contact}
            title={tFooter("contact")}
            emptyHint={tFooter("contactEmptyHint")}
            labels={{
              email: tContact("email"),
              whatsapp: tContact("whatsapp"),
              telegram: tContact("telegram"),
              facebook: tContact("facebook"),
              instagram: tContact("instagram"),
            }}
          />
        ) : null}

        <footer className="public-footer">
          <div className="public-footer__inner">
            <div className="public-footer__grid">
              <div>
                <p className="public-footer__brand-name">{config.displayName}</p>
                {tagline ? <p className="public-footer__brand-desc">{tagline}</p> : null}
              </div>
              {showBookingFooter || termsLabel || privacyLabel ? (
                <div>
                  <p className="public-footer__label">{tFooter("links")}</p>
                  <nav className="public-footer__links">
                    {showBookingFooter ? <span>{tFooter("bookingRequest")}</span> : null}
                    {termsLabel ? <span>{termsLabel}</span> : null}
                    {privacyLabel ? <span>{privacyLabel}</span> : null}
                  </nav>
                </div>
              ) : null}
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

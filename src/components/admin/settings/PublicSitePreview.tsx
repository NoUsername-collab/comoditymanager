"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BrandMarkSvg } from "@/components/public/BrandMarkSvg";
import { buildPublicContactLinks } from "@/features/public-site/contact/PublicContactBar";
import { PublicHeroBlock } from "@/features/public-site/hero/PublicHeroBlock";
import { renderPublicSection } from "@/features/public-site/sections/render-section";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  publicThemeClassName,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import "@/app/public-site.css";
import "@/app/public-site-v2.css";

const PREVIEW_SECTION_LIMIT = 2;

export function PublicSitePreview({ config, locale }: { config: PublicSiteConfig; locale: string }) {
  const tHeader = useTranslations("public.header");
  const tFooter = useTranslations("public.footer");
  const tHome = useTranslations("public.home");

  const checkTimesLabel = tHome("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });

  const templateClass =
    config.templateId === "editorial"
      ? "pub-home pub-home--editorial"
      : config.templateId === "immersive"
        ? "pub-home pub-home--immersive"
        : "pub-home pub-home--classic";

  const visibleSections = useMemo(
    () => config.sections.filter((section) => section.visible).slice(0, PREVIEW_SECTION_LIMIT),
    [config.sections],
  );

  const contactLinks = buildPublicContactLinks(config.contact);

  const showBookingNav =
    config.bookingEnabled &&
    (config.bookingNavPosition === "nav" || config.bookingNavPosition === "both");

  return (
    <div
      className={[
        "settings-public-preview",
        "pub-site",
        publicThemeClassName(config.themeId),
      ].join(" ")}
      style={resolvePublicThemeStyle(config.themeId)}
    >
      <div className="settings-public-preview__chrome" aria-hidden>
        <span className="settings-public-preview__dot" />
        <span className="settings-public-preview__dot" />
        <span className="settings-public-preview__dot" />
        <span className="settings-public-preview__url">{config.displayName}</span>
      </div>
      <div className="settings-public-preview__viewport">
        <header className="public-header settings-public-preview__header">
          <div className="public-header__inner">
            <div className="public-header__brand">
              <BrandMarkSvg animated={false} className="h-9 w-9 sm:h-10 sm:w-10" />
              <div className="min-w-0 leading-tight">
                <span className="public-header__name">{config.displayName}</span>
                <span className="public-header__tag">{tHeader("subtitle")}</span>
              </div>
            </div>
            {showBookingNav ? (
              <span className="public-header__link public-header__link--active">
                {tFooter("bookingRequest")}
              </span>
            ) : null}
          </div>
        </header>

        <main className={templateClass}>
          <PublicHeroBlock
            config={config}
            locale={locale}
            variant={config.templateId}
            checkTimesLabel={checkTimesLabel}
            preview
          />
          {visibleSections.map((section) => (
            <div key={section.id}>
              {renderPublicSection(section, locale, config.templateId)}
            </div>
          ))}
        </main>

        {contactLinks.length > 0 ? (
          <section className="pub-contact-bar" aria-hidden>
            <div className="pub-contact-bar__inner">
              <p className="pub-contact-bar__title">{tFooter("contact")}</p>
              <div className="pub-contact-bar__links">
                {contactLinks.slice(0, 4).map((link) => (
                  <span key={link.id} className={`pub-contact-chip pub-contact-chip--${link.id}`}>
                    {link.label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <footer className="public-footer settings-public-preview__footer">
          <div className="public-footer__inner">
            <p className="public-footer__brand-name">{config.displayName}</p>
            <p className="public-footer__brand-desc">{tFooter("tagline")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

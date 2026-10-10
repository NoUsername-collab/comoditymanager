"use client";

import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import type {
  PublicBenefitItem,
  PublicSiteConfig,
  PublicTemplateId,
} from "@/features/public-site/domain/types";
import { useTranslations } from "next-intl";

export function PublicHomeExtras({
  config,
  locale,
  preview = false,
  layout = "classic",
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
  layout?: PublicTemplateId;
}) {
  const t = useTranslations("public.home");

  const benefitsSection = config.sections.find(
    (section) => section.sectionType === "benefits" && section.visible,
  );
  const benefitItems = (benefitsSection?.payload.items ?? []) as PublicBenefitItem[];
  const amenityLabels =
    layout === "classic"
      ? benefitItems
          .map((item) => pickLocalized(item.title, locale))
          .filter(Boolean)
          .slice(0, 4)
      : [];

  // Check-in/out lives in the hero on every layout; this strip only lists highlights.
  const showBookingBar = config.bookingEnabled;
  const ctaPrimary = pickLocalized(config.hero.ctaPrimary, locale, [t("ctaBook")]);

  if (amenityLabels.length === 0 && !showBookingBar) {
    return null;
  }

  return (
    <>
      {amenityLabels.length > 0 ? (
        <section className="pub-home-extras" aria-label={t("extrasAria")}>
          <div className="pub-home-extras__inner">
            <ul className="pub-home-extras__amenities">
              {amenityLabels.map((label) => (
                <li key={label} className="pub-home-extras__amenity">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {showBookingBar ? (
        <div className="pub-mobile-booking-bar" data-surface="public">
          {preview ? (
            <span className="pub-mobile-booking-bar__btn">{ctaPrimary}</span>
          ) : (
            <Link
              href={safeNavHref(config.hero.ctaPrimaryHref, "/calendar")}
              className="pub-mobile-booking-bar__btn"
            >
              {ctaPrimary}
            </Link>
          )}
        </div>
      ) : null}
    </>
  );
}

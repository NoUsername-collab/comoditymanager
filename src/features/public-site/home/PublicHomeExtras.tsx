"use client";

import { Link } from "@/i18n/navigation";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import type { PublicBenefitItem, PublicSiteConfig } from "@/features/public-site/domain/types";
import { useTranslations } from "next-intl";

/** Classic only: the first highlights as a strip right under the hero. */
export function PublicAmenityStrip({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = useTranslations("public.home");
  const benefitsSection = config.sections.find(
    (section) => section.sectionType === "benefits" && section.visible,
  );
  const labels = ((benefitsSection?.payload.items ?? []) as PublicBenefitItem[])
    .map((item) => pickOwnLocalized(item.title, locale))
    .filter(Boolean)
    .slice(0, 4);
  if (labels.length === 0) return null;

  return (
    <section className="pub-home-extras" aria-label={t("extrasAria")}>
      <div className="pub-home-extras__inner">
        <ul className="pub-home-extras__amenities">
          {labels.map((label) => (
            <li key={label} className="pub-home-extras__amenity">
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Phone-only booking button, on every layout. Render it as the last child of
 * `<main>`: a sticky bar stays at the bottom of the screen only while its spot
 * in the page is still below, so placed last it stays for the whole scroll.
 */
export function PublicMobileBookingBar({
  config,
  locale,
  preview = false,
}: {
  config: PublicSiteConfig;
  locale: string;
  preview?: boolean;
}) {
  const label = pickOwnLocalized(config.hero.ctaPrimary, locale);
  if (!config.bookingEnabled || !label) return null;

  return (
    <div className="pub-mobile-booking-bar" data-surface="public">
      {preview ? (
        <span className="pub-mobile-booking-bar__btn">{label}</span>
      ) : (
        <Link
          href={safeNavHref(config.hero.ctaPrimaryHref, "/calendar")}
          className="pub-mobile-booking-bar__btn"
        >
          {label}
        </Link>
      )}
    </div>
  );
}

import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import type {
  PublicBenefitItem,
  PublicSiteConfig,
} from "@/features/public-site/domain/types";
import { getTranslations } from "next-intl/server";

export async function PublicHomeExtras({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = await getTranslations("public.home");

  const benefitsSection = config.sections.find(
    (section) => section.sectionType === "benefits" && section.visible,
  );
  const benefitItems = (benefitsSection?.payload.items ?? []) as PublicBenefitItem[];
  const amenityLabels = benefitItems
    .map((item) => pickLocalized(item.title, locale))
    .filter(Boolean)
    .slice(0, 4);

  const showCheckStrip = config.hero.showCheckTimes !== false;
  const showBookingBar = config.bookingEnabled;
  const ctaPrimary = pickLocalized(config.hero.ctaPrimary, locale, [t("ctaBook")]);

  if (!showCheckStrip && amenityLabels.length === 0 && !showBookingBar) {
    return null;
  }

  return (
    <>
      {showCheckStrip || amenityLabels.length > 0 ? (
        <section className="pub-home-extras" aria-label={t("extrasAria")}>
          <div className="pub-home-extras__inner">
            {showCheckStrip ? (
              <div className="pub-home-extras__check">
                <p className="pub-home-extras__check-label">{t("checkTimesLabel")}</p>
                <p className="pub-home-extras__check-value">
                  {t("checkTimes", {
                    checkIn: config.checkInTime,
                    checkOut: config.checkOutTime,
                  })}
                </p>
              </div>
            ) : null}
            {amenityLabels.length > 0 ? (
              <ul className="pub-home-extras__amenities">
                {amenityLabels.map((label) => (
                  <li key={label} className="pub-home-extras__amenity">
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      {showBookingBar ? (
        <div className="pub-mobile-booking-bar" data-surface="public">
          <Link href={safeNavHref(config.hero.ctaPrimaryHref, "/calendar")} className="pub-mobile-booking-bar__btn">
            {ctaPrimary}
          </Link>
        </div>
      ) : null}
    </>
  );
}

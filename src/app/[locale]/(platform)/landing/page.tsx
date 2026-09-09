import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { LandingHeroShowcase } from "@/features/signup/ui/LandingHeroShowcase";
import { LandingFeatureBand } from "@/features/signup/ui/LandingFeatureBand";
import { PricingGrid } from "@/features/signup/ui/PricingGrid";
import {
  BookingFormMockup,
  GuestAppMockup,
} from "@/features/signup/ui/LandingMockups";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tp] = await Promise.all([
    getTranslations("landing"),
    getTranslations("pricing"),
  ]);

  const demoHref = `mailto:${PLATFORM_CONTACT_EMAIL}?subject=${encodeURIComponent(t("demoEmailSubject"))}`;

  return (
    <main className="lp">
      <section className="lp-hero lp-hero--desk" aria-labelledby="lp-hero-title">
        <div className="lp-hero__grid">
          <div className="lp-hero__copy">
            <h1 className="lp-hero__title" id="lp-hero-title">
              {t.rich("heroTitle", {
                accent: (chunks) => (
                  <span className="lp-hero__title-accent">{chunks}</span>
                ),
              })}
            </h1>
            <p className="lp-hero__subtitle">{t("heroSubtitle")}</p>

            <div className="lp-hero__actions">
              <Link href="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                {t("heroCta")}
              </Link>
              <a href={demoHref} className="lp-hero__demo">
                {t("heroCtaDemo")}
              </a>
            </div>

            <p className="lp-hero__note">{t("heroNote")}</p>
          </div>

          <div className="lp-hero__visual">
            <LandingHeroShowcase title={t("mockup.calendarTitle")} />
          </div>
        </div>
      </section>

      <LandingFeatureBand
        align="copy-first"
        title={t("shiftTitle")}
        description={t("shiftDesc")}
      />

      <section className="lp-desk-stations" aria-label={t("stationsAria")}>
        <article className="lp-desk-station">
          <h3 className="lp-desk-station__title">{t("stationSiteTitle")}</h3>
          <p className="lp-desk-station__desc">{t("stationSiteDesc")}</p>
          <BookingFormMockup
            labels={{
              checkIn: t("mockup.checkIn"),
              nights: t("mockup.nights"),
              roomsAvailable: t("mockup.roomsAvailable"),
              month: t("mockup.monthShort"),
              roomDouble: t("mockup.roomDouble"),
              roomTwin: t("mockup.roomTwin"),
              roomSuite: t("mockup.roomSuite"),
              free: t("mockup.free"),
              occupied: t("mockup.occupied"),
              sendRequest: t("mockup.sendRequest"),
              room: t("mockup.room"),
            }}
          />
        </article>
        <article className="lp-desk-station">
          <h3 className="lp-desk-station__title">{t("stationGuestTitle")}</h3>
          <p className="lp-desk-station__desc">{t("stationGuestDesc")}</p>
          <GuestAppMockup
            labels={{
              welcome: t("mockup.welcome"),
              guestName: t("mockup.guestName"),
              stay: t("mockup.stay"),
              wifi: t("mockup.wifi"),
              facilities: t("mockup.facilities"),
              breakfast: t("mockup.breakfast"),
              localGuide: t("mockup.localGuide"),
              onlineCheckin: t("mockup.onlineCheckin"),
              onlineCheckinHint: t("mockup.onlineCheckinHint"),
              wifiNetwork: t("mockup.wifiNetwork"),
              wifiName: t("mockup.wifiName"),
              wifiPassword: t("mockup.wifiPassword"),
            }}
          />
        </article>
      </section>

      <section
        className="lp-pricing-section"
        id="preturi"
        aria-labelledby="lp-pricing-title"
      >
        <h2 className="lp-section-title" id="lp-pricing-title">
          {tp("gridTitle")}
        </h2>
        <p className="lp-section-lead">{tp("gridLead")}</p>
        <PricingGrid featuredPlan="professional" />
        <p className="lp-pricing-note">{tp("vatNote")}</p>
        <div className="lp-pricing-more">
          <Link href="/preturi" className="lp-btn lp-btn--ghost">
            {t("pricingCompareCta")}
          </Link>
        </div>
      </section>

      <p className="lp-legal-line">
        {t("trustLegalPrefix")}{" "}
        <Link href="/confidentialitate">{t("trustLegalLink")}</Link>
        {t("trustLegalSuffix")}
      </p>

      <section className="lp-faq-section" aria-labelledby="lp-faq-title">
        <h2 className="lp-section-title" id="lp-faq-title">
          {tp("faqTitle")}
        </h2>
        <div className="lp-faq">
          {[1, 2, 3, 4].map((i) => (
            <details key={i} className="lp-faq__item">
              <summary className="lp-faq__q">{tp(`faq${i}Q`)}</summary>
              <p className="lp-faq__a">{tp(`faq${i}A`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final-cta" aria-labelledby="lp-final-title">
        <div className="lp-final-cta__inner">
          <h2 className="lp-final-cta__title" id="lp-final-title">
            {t.rich("finalCtaTitle", {
              accent: (chunks) => (
                <span className="lp-final-cta__title-accent">{chunks}</span>
              ),
            })}
          </h2>
          <p className="lp-final-cta__text">{t("finalCtaText")}</p>
          <div className="lp-final-cta__actions">
            <Link href="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
              {t("finalCtaButton")}
            </Link>
          </div>
          <p className="lp-final-cta__note">{t("heroNote")}</p>
        </div>
      </section>
    </main>
  );
}

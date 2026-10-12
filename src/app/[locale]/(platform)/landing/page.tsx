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

const INCLUDED = ["checkin", "availability", "fiscal", "buildings"] as const;

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
  const bookingLabels = {
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
  };

  return (
    <main className="lp">
      <section className="lp-hero lp-hero--desk" aria-labelledby="lp-hero-title">
        <div className="lp-hero__grid">
          <div className="lp-hero__copy">
            <p className="lp-badge lp-badge--violet">{t("heroBadge")}</p>
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
            <LandingHeroShowcase
              labels={{
                title: t("mockup.calendarTitle"),
                confirmed: t("mockup.confirmed"),
                request: t("mockup.request"),
                hold: t("mockup.hold"),
                stays: {
                  ionescu: t("mockup.stayIonescu"),
                  popa: t("mockup.stayPopa"),
                  marin: t("mockup.stayMarin"),
                  georgiev: t("mockup.stayGeorgiev"),
                  dumitru: t("mockup.stayDumitru"),
                  request: t("mockup.request"),
                  hold: t("mockup.hold"),
                },
              }}
            />
          </div>
        </div>
      </section>

      <section className="lp-stats-wrap" aria-label={t("statsAria")}>
        <ul className="lp-stats">
          {([1, 2, 3, 4] as const).map((index) => (
            <li key={index} className="lp-stats__item">
              <span className="lp-stats__value">{t(`stat${index}Value`)}</span>
              <span className="lp-stats__label">{t(`stat${index}Label`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <LandingFeatureBand
        align="copy-first"
        alt
        eyebrow={t("featSiteEyebrow")}
        title={t("featSiteTitle")}
        description={t("featSiteDesc")}
        items={[t("featSiteL1"), t("featSiteL2"), t("featSiteL3"), t("featSiteL4")]}
      >
        <BookingFormMockup labels={bookingLabels} />
      </LandingFeatureBand>

      <LandingFeatureBand
        align="visual-first"
        eyebrow={t("featGuestEyebrow")}
        title={t("featGuestTitle")}
        description={t("featGuestDesc")}
        items={[t("featGuestL1"), t("featGuestL2"), t("featGuestL3"), t("featGuestL4")]}
      >
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
      </LandingFeatureBand>

      <section className="lp-block" id="instrumente" aria-labelledby="lp-tools-title">
        <h2 className="lp-section-title" id="lp-tools-title">
          {t("toolsTitle")}
        </h2>
        <p className="lp-section-lead">{t("toolsLead")}</p>
        <ul className="lp-tool-grid" aria-label={t("toolsAria")}>
          {INCLUDED.map((key) => (
            <li key={key} className="lp-tool">
              <h3 className="lp-tool__title">{t(`tools.${key}.title`)}</h3>
              <p className="lp-tool__desc">{t(`tools.${key}.desc`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="lp-block lp-block--alt" aria-labelledby="lp-how-title">
        <h2 className="lp-section-title" id="lp-how-title">
          {t("howTitle")}
        </h2>
        <p className="lp-section-lead">{t("howLead")}</p>
        <ol className="lp-steps">
          {([1, 2, 3] as const).map((step) => (
            <li key={step} className="lp-steps__item">
              <span className="lp-steps__index">{step}</span>
              <h3 className="lp-steps__title">{t(`step${step}Title`)}</h3>
              <p className="lp-steps__desc">{t(`step${step}Desc`)}</p>
            </li>
          ))}
        </ol>
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

      <p className="lp-assurance">
        {t("trustSectionLead")}{" "}
        <Link href="/confidentialitate">{t("trustLegalLink")}</Link>
        {t("trustLegalSuffix")}
      </p>

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

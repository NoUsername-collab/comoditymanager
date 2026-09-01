import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { LandingHeroShowcase } from "@/features/signup/ui/LandingHeroShowcase";
import { LandingTools } from "@/features/signup/ui/LandingTools";
import { LandingTrustCards } from "@/features/signup/ui/LandingTrustCards";
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
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero__glow" aria-hidden />
        <div className="lp-hero__grid">
          <div className="lp-hero__copy">
            <span className="lp-badge lp-badge--rainbow">{t("heroBadge")}</span>
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
              <a href={demoHref} className="lp-btn lp-btn--ghost lp-btn--lg">
                {t("heroCtaDemo")}
              </a>
            </div>

            <p className="lp-hero__note">{t("heroNote")}</p>

            <div className="lp-stats-inline" aria-label={t("statsAria")}>
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">{t("stat1Value")}</span>
                <span className="lp-stat-inline__label">{t("stat1Label")}</span>
              </div>
              <div className="lp-stat-inline__divider" />
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">{t("stat2Value")}</span>
                <span className="lp-stat-inline__label">{t("stat2Label")}</span>
              </div>
              <div className="lp-stat-inline__divider" />
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">{t("stat3Value")}</span>
                <span className="lp-stat-inline__label">{t("stat3Label")}</span>
              </div>
            </div>
          </div>

          <div className="lp-hero__visual">
            <LandingHeroShowcase />
          </div>
        </div>
      </section>

      <section className="lp-trust-strip" aria-label={t("trustStripAria")}>
        <p className="lp-trust-strip__lead">{t("trustLead")}</p>
        <div className="lp-trust-strip__badges">
          <span className="lp-trust-badge">{t("trust1")}</span>
          <span className="lp-trust-badge">{t("trust2")}</span>
          <span className="lp-trust-badge">{t("trust3")}</span>
        </div>
      </section>

      <LandingFeatureBand
        align="copy-first"
        eyebrow={t("featGanttEyebrow")}
        title={t("featGanttTitle")}
        description={t("featGanttDesc")}
        items={[
          t("featGanttL1"),
          t("featGanttL2"),
          t("featGanttL3"),
          t("featGanttL4"),
        ]}
      >
        <LandingHeroShowcase />
      </LandingFeatureBand>

      <LandingFeatureBand
        align="visual-first"
        eyebrow={t("featSiteEyebrow")}
        title={t("featSiteTitle")}
        description={t("featSiteDesc")}
        items={[
          t("featSiteL1"),
          t("featSiteL2"),
          t("featSiteL3"),
          t("featSiteL4"),
        ]}
      >
        <BookingFormMockup />
      </LandingFeatureBand>

      <LandingFeatureBand
        align="copy-first"
        eyebrow={t("featGuestEyebrow")}
        title={t("featGuestTitle")}
        description={t("featGuestDesc")}
        items={[
          t("featGuestL1"),
          t("featGuestL2"),
          t("featGuestL3"),
          t("featGuestL4"),
        ]}
      >
        <GuestAppMockup />
      </LandingFeatureBand>

      <LandingTools />

      <section className="lp-steps-section" aria-labelledby="lp-how-title">
        <h2 className="lp-section-title" id="lp-how-title">
          {t("howTitle")}
        </h2>
        <p className="lp-section-lead">{t("howLead")}</p>
        <ol className="lp-steps">
          {[
            { num: "01", title: t("step1Title"), desc: t("step1Desc") },
            { num: "02", title: t("step2Title"), desc: t("step2Desc") },
            { num: "03", title: t("step3Title"), desc: t("step3Desc") },
          ].map((s) => (
            <li key={s.num} className="lp-step">
              <div className="lp-step__num">{s.num}</div>
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__desc">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-compare-section" aria-labelledby="lp-problem-title">
        <h2 className="lp-section-title" id="lp-problem-title">
          {t("problemTitle")}
        </h2>
        <div className="lp-compare">
          <div className="lp-compare__col lp-compare__col--bad">
            <div className="lp-compare__col-header">
              <h3>{t("withoutZalmox")}</h3>
            </div>
            <ul>
              <li>{t("problem1")}</li>
              <li>{t("problem2")}</li>
              <li>{t("problem3")}</li>
              <li>{t("problem4")}</li>
            </ul>
          </div>
          <div className="lp-compare__col lp-compare__col--good">
            <div className="lp-compare__col-header">
              <h3>{t("withZalmox")}</h3>
            </div>
            <ul>
              <li>{t("solution1")}</li>
              <li>{t("solution2")}</li>
              <li>{t("solution3")}</li>
              <li>{t("solution4")}</li>
            </ul>
          </div>
        </div>
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

      <LandingTrustCards />

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
            <a href={demoHref} className="lp-btn lp-btn--ghost-light lp-btn--lg">
              {t("heroCtaDemo")}
            </a>
          </div>
          <p className="lp-final-cta__note">{t("heroNote")}</p>
        </div>
      </section>
    </main>
  );
}

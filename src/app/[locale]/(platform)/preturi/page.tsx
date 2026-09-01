import { Link } from "@/i18n/navigation";
import {
  PricingComparisonTable,
  PricingGrid,
} from "@/features/signup/ui/PricingGrid";
import { getTranslations } from "next-intl/server";

export default async function PreturiPage() {
  const t = await getTranslations("pricing");

  return (
    <main className="landing landing--split landing--sales">
      <div className="landing-surface landing-surface--light">
        <div className="landing-surface__inner">
          <section className="landing-hero landing-hero--compact">
            <div className="landing-hero__glow" aria-hidden />
            <div className="landing-hero__inner landing-hero__inner--centered">
              <span className="landing-hero__badge">{t("heroBadge")}</span>
              <h1 className="landing-hero__title">{t("pageTitle")}</h1>
              <p className="landing-hero__subtitle">{t("pageLead")}</p>
              <div className="landing-stats" aria-label={t("statsAria")}>
                <div className="landing-stat">
                  <span className="landing-stat__value">0 EUR</span>
                  <span className="landing-stat__label">{t("statFree")}</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat__value">5</span>
                  <span className="landing-stat__label">{t("statRooms")}</span>
                </div>
                <div className="landing-stat">
                  <span className="landing-stat__value">0%</span>
                  <span className="landing-stat__label">{t("statCommission")}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-section" id="preturi">
            <h2 className="landing-section__title">{t("gridTitle")}</h2>
            <p className="landing-section__lead">{t("gridLead")}</p>
            <PricingGrid featuredPlan="professional" />
            <p className="landing-pricing-note">{t("vatNote")}</p>
          </section>
        </div>
      </div>

      <div className="landing-surface landing-surface--soft">
        <div className="landing-surface__inner">
          <section className="landing-section landing-section--muted">
            <h2 className="landing-section__title">{t("comparisonTitle")}</h2>
            <p className="landing-section__lead">{t("comparisonLead")}</p>
            <PricingComparisonTable />
          </section>

          <section className="landing-section">
            <h2 className="landing-section__title">{t("faqTitle")}</h2>
            <div className="landing-faq">
              {[1, 2, 3, 4].map((i) => (
                <details key={i} className="landing-faq__item">
                  <summary className="landing-faq__q">{t(`faq${i}Q`)}</summary>
                  <p className="landing-faq__a">{t(`faq${i}A`)}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="landing-final-cta">
            <h2 className="landing-final-cta__title">{t("finalTitle")}</h2>
            <p className="landing-final-cta__text">{t("finalText")}</p>
            <Link href="/signup" className="landing-cta landing-cta--primary landing-cta--large">
              {t("finalCta")}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

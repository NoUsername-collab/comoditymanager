import { Link } from "@/i18n/navigation";
import { PricingGrid } from "@/components/platform/PricingGrid";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const [t, tp] = await Promise.all([
    getTranslations("landing"),
    getTranslations("pricing"),
  ]);

  return (
    <main className="landing landing--split">
      <div className="landing-surface landing-surface--light">
        <div className="landing-surface__inner">
          <section className="landing-hero">
            <div className="landing-hero__glow" aria-hidden />
            <div className="landing-hero__grid">
              <div className="landing-hero__inner">
                <span className="landing-hero__badge">{t("heroBadge")}</span>
                <h1 className="landing-hero__title" suppressHydrationWarning>
                  {t("heroTitle")}
                </h1>
                <p className="landing-hero__subtitle">{t("heroSubtitle")}</p>
                <div className="landing-hero__actions">
                  <Link href="/signup" className="landing-cta landing-cta--primary">
                    {t("heroCta")}
                  </Link>
                  <Link href="/preturi" className="landing-cta landing-cta--ghost">
                    {t("heroCtaSecondary")}
                  </Link>
                </div>
                <p className="landing-hero__note">{t("heroNote")}</p>
                <div className="landing-stats landing-stats--inline">
                  <div className="landing-stat">
                    <span className="landing-stat__value">0 EUR</span>
                    <span className="landing-stat__label">{tp("statFree")}</span>
                  </div>
                  <div className="landing-stat">
                    <span className="landing-stat__value">30s</span>
                    <span className="landing-stat__label">{t("statSetup")}</span>
                  </div>
                  <div className="landing-stat">
                    <span className="landing-stat__value">0%</span>
                    <span className="landing-stat__label">{tp("statCommission")}</span>
                  </div>
                </div>
              </div>

              <div className="landing-showcase landing-showcase--pro" aria-hidden>
                <div className="landing-showcase__chrome">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="landing-showcase__body">
                  <div className="landing-showcase__sidebar">
                    <span className="landing-showcase__nav landing-showcase__nav--active" />
                    <span className="landing-showcase__nav" />
                    <span className="landing-showcase__nav" />
                    <span className="landing-showcase__nav" />
                  </div>
                  <div className="landing-showcase__main">
                    <div className="landing-showcase__row landing-showcase__row--head" />
                    <div className="landing-showcase__row" />
                    <div className="landing-showcase__row landing-showcase__row--accent" />
                    <div className="landing-showcase__row" />
                    <div className="landing-showcase__row landing-showcase__row--muted" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-trust">
            <p className="landing-trust__lead">{t("trustLead")}</p>
            <div className="landing-trust__items">
              <span>{t("trust1")}</span>
              <span>{t("trust2")}</span>
              <span>{t("trust3")}</span>
            </div>
          </section>

          <section className="landing-section">
            <h2 className="landing-section__title">{t("problemTitle")}</h2>
            <div className="landing-comparison">
              <div className="landing-comparison__col landing-comparison__col--bad">
                <h3 className="landing-comparison__heading">{t("withoutNestio")}</h3>
                <ul className="landing-comparison__list">
                  <li>{t("problem1")}</li>
                  <li>{t("problem2")}</li>
                  <li>{t("problem3")}</li>
                  <li>{t("problem4")}</li>
                </ul>
              </div>
              <div className="landing-comparison__col landing-comparison__col--good">
                <h3 className="landing-comparison__heading">{t("withNestio")}</h3>
                <ul className="landing-comparison__list">
                  <li>{t("solution1")}</li>
                  <li>{t("solution2")}</li>
                  <li>{t("solution3")}</li>
                  <li>{t("solution4")}</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="landing-surface landing-surface--soft">
        <div className="landing-surface__inner">
          <section className="landing-section">
            <h2 className="landing-section__title">{t("featuresTitle")}</h2>
            <p className="landing-section__lead">{t("featuresLead")}</p>
            <div className="landing-features">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <article key={i} className="landing-feature">
                  <div className="landing-feature__icon" aria-hidden>
                    {t(`feature${i}Icon`)}
                  </div>
                  <h3 className="landing-feature__title">{t(`feature${i}Title`)}</h3>
                  <p className="landing-feature__desc">{t(`feature${i}Desc`)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <h2 className="landing-section__title">{t("howTitle")}</h2>
            <div className="landing-steps">
              {[1, 2, 3].map((i) => (
                <div key={i} className="landing-step">
                  <span className="landing-step__num">{i}</span>
                  <h3 className="landing-step__title">{t(`step${i}Title`)}</h3>
                  <p className="landing-step__desc">{t(`step${i}Desc`)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-section landing-section--pricing" id="preturi">
            <h2 className="landing-section__title">{tp("gridTitle")}</h2>
            <p className="landing-section__lead">{tp("gridLead")}</p>
            <PricingGrid featuredPlan="professional" />
            <p className="landing-pricing-note">{tp("vatNote")}</p>
            <div className="landing-section__actions">
              <Link href="/preturi" className="landing-cta landing-cta--ghost">
                {t("pricingCompareCta")}
              </Link>
            </div>
          </section>

          <section className="landing-final-cta">
            <h2 className="landing-final-cta__title">{t("finalCtaTitle")}</h2>
            <p className="landing-final-cta__text">{t("finalCtaText")}</p>
            <Link href="/signup" className="landing-cta landing-cta--primary landing-cta--large">
              {t("finalCtaButton")}
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <main className="landing">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero__glow" aria-hidden />
        <div className="landing-hero__inner">
          <span className="landing-hero__badge">{t("heroBadge")}</span>
          <h1 className="landing-hero__title">{t("heroTitle")}</h1>
          <p className="landing-hero__subtitle">{t("heroSubtitle")}</p>
          <div className="landing-hero__actions">
            <Link href="/signup" className="landing-cta landing-cta--primary">
              {t("heroCta")}
            </Link>
            <a href="#preturi" className="landing-cta landing-cta--ghost">
              {t("heroCtaSecondary")}
            </a>
          </div>
          <p className="landing-hero__note">{t("heroNote")}</p>
        </div>
      </section>

      {/* ── Problem / Solution ──────────────────────────────────── */}
      <section className="landing-section">
        <h2 className="landing-section__title">{t("problemTitle")}</h2>
        <div className="landing-comparison">
          <div className="landing-comparison__col landing-comparison__col--bad">
            <h3 className="landing-comparison__heading">{t("withoutHospira")}</h3>
            <ul className="landing-comparison__list">
              <li>{t("problem1")}</li>
              <li>{t("problem2")}</li>
              <li>{t("problem3")}</li>
              <li>{t("problem4")}</li>
            </ul>
          </div>
          <div className="landing-comparison__col landing-comparison__col--good">
            <h3 className="landing-comparison__heading">{t("withHospira")}</h3>
            <ul className="landing-comparison__list">
              <li>{t("solution1")}</li>
              <li>{t("solution2")}</li>
              <li>{t("solution3")}</li>
              <li>{t("solution4")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
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

      {/* ── How it works ────────────────────────────────────────── */}
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

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section className="landing-section" id="preturi">
        <h2 className="landing-section__title">{t("pricingTitle")}</h2>
        <p className="landing-section__lead">{t("pricingLead")}</p>
        <div className="landing-pricing">
          {/* Starter */}
          <div className="landing-price-card">
            <h3 className="landing-price-card__name">{t("planStarterName")}</h3>
            <div className="landing-price-card__price">
              <span className="landing-price-card__amount">0</span>
              <span className="landing-price-card__currency">RON</span>
            </div>
            <p className="landing-price-card__period">{t("planForever")}</p>
            <ul className="landing-price-card__features">
              <li>{t("planStarter1")}</li>
              <li>{t("planStarter2")}</li>
              <li>{t("planStarter3")}</li>
              <li>{t("planStarter4")}</li>
            </ul>
            <Link href="/signup" className="landing-cta landing-cta--outline">
              {t("planStarterCta")}
            </Link>
          </div>

          {/* Standard */}
          <div className="landing-price-card">
            <h3 className="landing-price-card__name">{t("planStandardName")}</h3>
            <div className="landing-price-card__price">
              <span className="landing-price-card__amount">99</span>
              <span className="landing-price-card__currency">RON/{t("month")}</span>
            </div>
            <p className="landing-price-card__period">{t("planTrial")}</p>
            <ul className="landing-price-card__features">
              <li>{t("planStandard1")}</li>
              <li>{t("planStandard2")}</li>
              <li>{t("planStandard3")}</li>
              <li>{t("planStandard4")}</li>
            </ul>
            <Link href="/signup" className="landing-cta landing-cta--outline">
              {t("planStandardCta")}
            </Link>
          </div>

          {/* Pro — recommended */}
          <div className="landing-price-card landing-price-card--featured">
            <span className="landing-price-card__badge">{t("planRecommended")}</span>
            <h3 className="landing-price-card__name">{t("planProName")}</h3>
            <div className="landing-price-card__price">
              <span className="landing-price-card__amount">199</span>
              <span className="landing-price-card__currency">RON/{t("month")}</span>
            </div>
            <p className="landing-price-card__period">{t("planTrial")}</p>
            <ul className="landing-price-card__features">
              <li>{t("planPro1")}</li>
              <li>{t("planPro2")}</li>
              <li>{t("planPro3")}</li>
              <li>{t("planPro4")}</li>
              <li>{t("planPro5")}</li>
            </ul>
            <Link href="/signup" className="landing-cta landing-cta--primary">
              {t("planProCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="landing-final-cta">
        <h2 className="landing-final-cta__title">{t("finalCtaTitle")}</h2>
        <p className="landing-final-cta__text">{t("finalCtaText")}</p>
        <Link href="/signup" className="landing-cta landing-cta--primary landing-cta--large">
          {t("finalCtaButton")}
        </Link>
      </section>
    </main>
  );
}

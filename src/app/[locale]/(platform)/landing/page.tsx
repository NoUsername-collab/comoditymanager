import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { LandingHeroShowcase } from "@/components/platform/LandingHeroShowcase";
import { LandingTools } from "@/components/platform/LandingTools";
import { LandingTrustCards } from "@/components/platform/LandingTrustCards";
import { PricingGrid } from "@/components/platform/PricingGrid";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LandingPage() {
  const [t, tp] = await Promise.all([
    getTranslations("landing"),
    getTranslations("pricing"),
  ]);

  const demoHref = `mailto:${PLATFORM_CONTACT_EMAIL}?subject=${encodeURIComponent(t("demoEmailSubject"))}`;

  return (
    <main className="landing landing--split">
      <div className="landing-surface landing-surface--light">
        <div className="landing-surface__inner">
          <section className="landing-hero" aria-labelledby="landing-hero-title">
            <div className="landing-hero__glow" aria-hidden />
            <div className="landing-hero__grid">
              <div className="landing-hero__inner">
                <span className="landing-hero__badge">{t("heroBadge")}</span>
                <h1
                  className="landing-hero__title"
                  id="landing-hero-title"
                  suppressHydrationWarning
                >
                  {t("heroTitle")}
                </h1>
                <p className="landing-hero__subtitle">{t("heroSubtitle")}</p>
                <div className="landing-hero__actions landing-hero__actions--multi">
                  <Link href="/signup" className="landing-cta landing-cta--primary">
                    {t("heroCta")}
                  </Link>
                  <a href={demoHref} className="landing-cta landing-cta--ghost">
                    {t("heroCtaDemo")}
                  </a>
                  <Link href="/admin/login" className="landing-cta landing-cta--link">
                    {t("heroCtaLogin")}
                  </Link>
                </div>
                <p className="landing-hero__note">
                  {t("heroNote")}{" "}
                  <a href="#instrumente" className="landing-hero__tools-link">
                    {t("heroCtaSecondary")}
                  </a>
                </p>
                <div
                  className="landing-stats landing-stats--inline"
                  aria-label={t("statsAria")}
                >
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
                <figure className="landing-social-proof">
                  <blockquote className="landing-social-proof__quote">
                    <p>{t("heroSocialQuote")}</p>
                  </blockquote>
                  <figcaption className="landing-social-proof__caption">
                    {t("heroSocialCaption")}
                  </figcaption>
                </figure>
              </div>

              <LandingHeroShowcase />
            </div>
          </section>

          <section className="landing-trust" aria-label={t("trustStripAria")}>
            <p className="landing-trust__lead">{t("trustLead")}</p>
            <div className="landing-trust__items">
              <span>{t("trust1")}</span>
              <span>{t("trust2")}</span>
              <span>{t("trust3")}</span>
            </div>
          </section>

          <section
            className="landing-section"
            aria-labelledby="landing-problem-title"
          >
            <h2 className="landing-section__title" id="landing-problem-title">
              {t("problemTitle")}
            </h2>
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
        </div>
      </div>

      <div className="landing-surface landing-surface--soft">
        <div className="landing-surface__inner">
          <LandingTools />

          <section
            className="landing-section"
            aria-labelledby="landing-how-title"
          >
            <h2 className="landing-section__title" id="landing-how-title">
              {t("howTitle")}
            </h2>
            <p className="landing-section__lead">{t("howLead")}</p>
            <ol className="landing-steps">
              {[1, 2, 3].map((i) => (
                <li key={i} className="landing-step">
                  <span className="landing-step__num" aria-hidden>
                    {i}
                  </span>
                  <h3 className="landing-step__title">{t(`step${i}Title`)}</h3>
                  <p className="landing-step__desc">{t(`step${i}Desc`)}</p>
                </li>
              ))}
            </ol>
          </section>

          <LandingTrustCards />

          <section
            className="landing-section landing-section--pricing"
            id="preturi"
            aria-labelledby="landing-pricing-title"
          >
            <h2 className="landing-section__title" id="landing-pricing-title">
              {tp("gridTitle")}
            </h2>
            <p className="landing-section__lead">{tp("gridLead")}</p>
            <PricingGrid featuredPlan="professional" />
            <p className="landing-pricing-note">{tp("vatNote")}</p>
            <div className="landing-section__actions">
              <Link href="/preturi" className="landing-cta landing-cta--ghost">
                {t("pricingCompareCta")}
              </Link>
            </div>
          </section>

          <section
            className="landing-section"
            aria-labelledby="landing-faq-title"
          >
            <h2 className="landing-section__title" id="landing-faq-title">
              {tp("faqTitle")}
            </h2>
            <div className="landing-faq">
              {[1, 2, 3, 4].map((i) => (
                <details key={i} className="landing-faq__item">
                  <summary className="landing-faq__q">{tp(`faq${i}Q`)}</summary>
                  <p className="landing-faq__a">{tp(`faq${i}A`)}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="landing-final-cta" aria-labelledby="landing-final-title">
            <h2 className="landing-final-cta__title" id="landing-final-title">
              {t("finalCtaTitle")}
            </h2>
            <p className="landing-final-cta__text">{t("finalCtaText")}</p>
            <div className="landing-final-cta__actions">
              <Link href="/signup" className="landing-cta landing-cta--primary landing-cta--large">
                {t("finalCtaButton")}
              </Link>
              <div className="landing-final-cta__secondary">
                <a href={demoHref} className="landing-cta landing-cta--ghost">
                  {t("heroCtaDemo")}
                </a>
                <Link href="/admin/login" className="landing-cta landing-cta--link">
                  {t("heroCtaLogin")}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

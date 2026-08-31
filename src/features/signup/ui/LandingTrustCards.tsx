import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const TRUST_IDS = ["security", "multiTenant", "gdpr"] as const;

export async function LandingTrustCards() {
  const t = await getTranslations("landing");

  return (
    <section
      className="lp-section lp-section--trust"
      aria-labelledby="landing-trust-title"
    >
      <h2 className="lp-section__title" id="landing-trust-title">
        {t("trustSectionTitle")}
      </h2>
      <p className="lp-section__lead">{t("trustSectionLead")}</p>
      <ul className="lp-trust-cards">
        {TRUST_IDS.map((id) => (
          <li key={id}>
            <article className="lp-trust-card">
              <span className="lp-trust-card__glyph" aria-hidden>
                {t(`trustCards.${id}.glyph`)}
              </span>
              <h3 className="lp-trust-card__title">
                {t(`trustCards.${id}.title`)}
              </h3>
              <p className="lp-trust-card__desc">
                {t(`trustCards.${id}.desc`)}
              </p>
            </article>
          </li>
        ))}
      </ul>
      <p className="lp-trust-card__legal">
        {t("trustLegalPrefix")}{" "}
        <Link href="/confidentialitate">{t("trustLegalLink")}</Link>
        {t("trustLegalSuffix")}
      </p>
    </section>
  );
}

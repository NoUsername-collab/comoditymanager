import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

const TRUST_IDS = ["security", "multiTenant", "gdpr"] as const;

export async function LandingTrustCards() {
  const t = await getTranslations("landing");

  return (
    <section
      className="landing-section landing-section--trust"
      aria-labelledby="landing-trust-title"
    >
      <h2 className="landing-section__title" id="landing-trust-title">
        {t("trustSectionTitle")}
      </h2>
      <p className="landing-section__lead">{t("trustSectionLead")}</p>
      <ul className="landing-trust-cards">
        {TRUST_IDS.map((id) => (
          <li key={id}>
            <article className="landing-trust-card">
              <span className="landing-trust-card__glyph" aria-hidden>
                {t(`trustCards.${id}.glyph`)}
              </span>
              <h3 className="landing-trust-card__title">
                {t(`trustCards.${id}.title`)}
              </h3>
              <p className="landing-trust-card__desc">
                {t(`trustCards.${id}.desc`)}
              </p>
            </article>
          </li>
        ))}
      </ul>
      <p className="landing-trust-card__legal">
        {t("trustLegalPrefix")}{" "}
        <Link href="/confidentialitate">{t("trustLegalLink")}</Link>
        {t("trustLegalSuffix")}
      </p>
    </section>
  );
}

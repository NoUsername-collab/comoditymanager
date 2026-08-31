import { Link } from "@/i18n/navigation";
import {
  CLOUD_PLAN_ORDER,
  formatPlanRoomLimit,
  getCloudMarketingPlans,
} from "@/core/config/marketing-plans";
import type { CloudPlan } from "@/core/config/plans";
import { getTranslations } from "next-intl/server";

type PricingGridProps = {
  /** Plan highlighted as recommended (defaults to professional). */
  featuredPlan?: CloudPlan;
  compact?: boolean;
};

export async function PricingGrid({
  featuredPlan = "professional",
  compact = false,
}: PricingGridProps) {
  const t = await getTranslations("pricing");
  const plans = getCloudMarketingPlans();

  return (
    <div className="lp">
      <div
        className={`lp-pricing-grid${compact ? " lp-pricing-grid--compact" : ""}`}
      >
        {plans.map((plan) => {
          const id = plan.id as CloudPlan;
          const featured = id === featuredPlan;
          const priceLabel =
            plan.priceEur === 0 ? t("priceFree") : t("billedMonthly");
          const roomsLabel = formatPlanRoomLimit(
            plan.maxRooms,
            t("roomsUnlimited")
          );
          const roomLine = t(`plans.${id}.roomLine`, { count: roomsLabel });
          const featureKeys = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
          const features = featureKeys
            .map((key) => t(`plans.${id}.${key}`))
            .filter((line) => line.length > 0 && !line.startsWith("plans."));

          return (
            <article
              key={id}
              className={`lp-price-card${featured ? " lp-price-card--featured" : ""}`}
            >
              {featured && (
                <span className="lp-price-card__badge">
                  {t("recommended")}
                </span>
              )}
              <p className="lp-price-card__tier">{t(`plans.${id}.name`)}</p>
              <h3 className="lp-price-card__name">
                {t(`plans.${id}.tagline`)}
              </h3>
              <div className="lp-price-card__price">
                <span className="lp-price-card__amount">
                  {plan.priceEur === 0 ? "0" : String(plan.priceEur)}
                </span>
                <span className="lp-price-card__currency">EUR</span>
                {plan.priceEur > 0 && (
                  <span className="lp-price-card__per">{t("perMonth")}</span>
                )}
              </div>
              <p className="lp-price-card__period">{priceLabel}</p>
              <p className="lp-price-card__rooms">{roomLine}</p>
              <ul className="lp-price-card__features">
                {features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`lp-btn ${
                  featured ? "lp-btn--primary" : "lp-btn--ghost"
                }`}
              >
                {t(`plans.${id}.cta`)}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const COMPARISON_FEATURES = [
  "rooms",
  "team",
  "gantt",
  "branding",
  "modules",
] as const;

export async function PricingComparisonTable() {
  const t = await getTranslations("pricing.comparison");
  const rows = CLOUD_PLAN_ORDER.map((id) => ({
    id,
    name: t(`plans.${id}`),
    rooms: t(`rooms.${id}`),
    team: t(`team.${id}`),
    gantt: t(`gantt.${id}`),
    branding: t(`branding.${id}`),
    modules: t(`modules.${id}`),
  }));

  return (
    <>
      <ul className="pricing-comparison-cards space-y-3">
        {rows.map((plan) => (
          <li
            key={plan.id}
            className="pricing-comparison-card rounded-xl border border-[var(--landing-border,#e7e5e4)] bg-white/80 p-4 shadow-sm"
          >
            <h3 className="text-base font-semibold text-[var(--landing-text,#1c1917)]">
              {plan.name}
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              {COMPARISON_FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="pricing-comparison-card__row flex items-start justify-between gap-3"
                >
                  <dt className="text-[var(--landing-text-muted,#78716c)]">
                    {t(`rows.${feature}`)}
                  </dt>
                  <dd className="text-right font-medium text-[var(--landing-text,#1c1917)]">
                    {plan[feature]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <div className="pricing-table-wrap pricing-table-desktop">
        <table className="pricing-table">
        <thead>
          <tr>
            <th scope="col">{t("featureCol")}</th>
            {rows.map((row) => (
              <th key={row.id} scope="col">
                {row.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t("rows.rooms")}</th>
            {rows.map((row) => (
              <td key={row.id}>{row.rooms}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t("rows.team")}</th>
            {rows.map((row) => (
              <td key={row.id}>{row.team}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t("rows.gantt")}</th>
            {rows.map((row) => (
              <td key={row.id}>{row.gantt}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t("rows.branding")}</th>
            {rows.map((row) => (
              <td key={row.id}>{row.branding}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t("rows.modules")}</th>
            {rows.map((row) => (
              <td key={row.id}>{row.modules}</td>
            ))}
          </tr>
        </tbody>
        </table>
      </div>
    </>
  );
}

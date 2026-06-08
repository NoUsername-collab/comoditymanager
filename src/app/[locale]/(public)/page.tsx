import { Link } from "@/i18n/navigation";
import { PublicStaffPreview } from "@/components/public/PublicStaffPreview";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadStaffPublicPreview } from "@/services/admin-dashboard";
import { getPensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("public.home");
  const tShell = await getTranslations("public.shell");
  let title = tShell("brandFallback");
  let checkIn = "14:00";
  let checkOut = "11:00";
  let staffPreview: Awaited<ReturnType<typeof loadStaffPublicPreview>> | null =
    null;

  try {
    const s = await getPensionSettings();
    if (s) {
      title = s.display_name;
      checkIn = s.default_check_in_time;
      checkOut = s.default_check_out_time;
    }
  } catch {
    /* dev fără DB */
  }

  try {
    const staffUser = await getAdminUser();
    if (staffUser) {
      staffPreview = await loadStaffPublicPreview();
    }
  } catch {
    staffPreview = null;
  }

  const features = [
    { icon: "🛏", h: t("feature1Title"), p: t("feature1Text") },
    { icon: "📅", h: t("feature2Title"), p: t("feature2Text") },
    { icon: "🤝", h: t("feature3Title"), p: t("feature3Text") },
  ];

  const steps = [
    { n: "1", h: t("step1Title"), p: t("step1Text") },
    { n: "2", h: t("step2Title"), p: t("step2Text") },
    { n: "3", h: t("step3Title"), p: t("step3Text") },
  ];

  return (
    <main className="ml-content flex flex-1 flex-col">
      <section className="public-hero">
        <div className="public-hero__glow" aria-hidden />
        <div className="public-hero__inner">
          <p className="public-hero__badge">{t("badge")}</p>
          <h1 className="public-hero__title">{title}</h1>
          <p className="public-hero__subtitle">{t("subtitle")}</p>
          <p className="public-hero__tagline">{t("tagline")}</p>
          <p className="public-hero__meta">
            {t("checkTimes", { checkIn, checkOut })}
          </p>
          <div className="public-hero__actions">
            <Link href="/calendar" className="site-cta">
              {t("ctaBook")}
            </Link>
            <Link href="/#cum-functioneaza" className="site-cta site-cta--ghost">
              {t("ctaHow")}
            </Link>
          </div>
        </div>
      </section>

      {staffPreview && <PublicStaffPreview data={staffPreview} />}

      <section className="public-section">
        <h2 className="public-section__title">{t("whyTitle")}</h2>
        <p className="public-section__lead">{t("whyLead")}</p>
        <div className="public-features">
          {features.map((item) => (
            <article key={item.h} className="public-feature-card">
              <div className="public-feature-card__icon" aria-hidden>
                {item.icon}
              </div>
              <h3 className="public-feature-card__title">{item.h}</h3>
              <p className="public-feature-card__text">{item.p}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section" id="cum-functioneaza">
        <h2 className="public-section__title">{t("stepsTitle")}</h2>
        <p className="public-section__lead">{t("stepsLead")}</p>
        <div className="public-steps">
          {steps.map((step) => (
            <article key={step.n} className="public-step">
              <span className="public-step__num">{step.n}</span>
              <h3 className="public-step__title">{step.h}</h3>
              <p className="public-step__text">{step.p}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-cta-band">
        <h2 className="public-cta-band__title">{t("ctaBandTitle")}</h2>
        <p className="public-cta-band__text">{t("ctaBandText")}</p>
        <Link href="/calendar" className="site-cta">
          {t("ctaBandButton")}
        </Link>
      </section>
    </main>
  );
}

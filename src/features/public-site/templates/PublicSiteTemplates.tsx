import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { renderPublicSection } from "@/features/public-site/sections/render-section";
import { getTranslations } from "next-intl/server";

function HeroBlock({
  config,
  locale,
  variant,
  checkTimesLabel,
}: {
  config: PublicSiteConfig;
  locale: string;
  variant: "classic" | "editorial" | "immersive";
  checkTimesLabel: string;
}) {
  const hero = config.hero;
  const title = pickLocalized(hero.title, locale, [config.displayName]);
  const subtitle = pickLocalized(hero.subtitle, locale);
  const tagline = pickLocalized(hero.tagline, locale);
  const badge = pickLocalized(hero.badge, locale);
  const ctaPrimary = pickLocalized(hero.ctaPrimary, locale);
  const ctaSecondary = pickLocalized(hero.ctaSecondary, locale);

  return (
    <section className={`pub-hero pub-hero--${variant}`}>
      <div className="pub-hero__glow" aria-hidden />
      {hero.imageUrl ? (
        <div
          className="pub-hero__media"
          style={{ backgroundImage: `url(${hero.imageUrl})` }}
          aria-hidden
        />
      ) : null}
      <div className="pub-hero__inner">
        {badge ? <p className="pub-hero__badge">{badge}</p> : null}
        <h1 className="pub-hero__title">{title}</h1>
        {subtitle ? <p className="pub-hero__subtitle">{subtitle}</p> : null}
        {tagline ? <p className="pub-hero__tagline">{tagline}</p> : null}
        {hero.showCheckTimes !== false ? (
          <p className="pub-hero__meta">{checkTimesLabel}</p>
        ) : null}
        <div className="pub-hero__actions">
          {config.bookingEnabled && ctaPrimary ? (
            <Link href={hero.ctaPrimaryHref ?? "/calendar"} className="pub-btn pub-btn--primary">
              {ctaPrimary}
            </Link>
          ) : null}
          {ctaSecondary ? (
            <Link
              href={hero.ctaSecondaryHref ?? "#public-intro"}
              className="pub-btn pub-btn--ghost"
            >
              {ctaSecondary}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ClassicPublicTemplate({
  config,
  locale,
  checkTimesLabel,
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
}) {
  return (
    <main className="pub-home pub-home--classic">
      <HeroBlock
        config={config}
        locale={locale}
        variant="classic"
        checkTimesLabel={checkTimesLabel}
      />
      {config.sections.map((section) => (
        <div key={section.id}>{renderPublicSection(section, locale, "classic")}</div>
      ))}
    </main>
  );
}

export function EditorialPublicTemplate({
  config,
  locale,
  checkTimesLabel,
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
}) {
  return (
    <main className="pub-home pub-home--editorial">
      <HeroBlock
        config={config}
        locale={locale}
        variant="editorial"
        checkTimesLabel={checkTimesLabel}
      />
      <div className="pub-home__stack">
        {config.sections.map((section, index) => (
          <div
            key={section.id}
            className={index % 2 === 1 ? "pub-home__stack-row pub-home__stack-row--alt" : "pub-home__stack-row"}
          >
            {renderPublicSection(section, locale, "editorial")}
          </div>
        ))}
      </div>
    </main>
  );
}

export function ImmersivePublicTemplate({
  config,
  locale,
  checkTimesLabel,
}: {
  config: PublicSiteConfig;
  locale: string;
  checkTimesLabel: string;
}) {
  return (
    <main className="pub-home pub-home--immersive">
      <HeroBlock
        config={config}
        locale={locale}
        variant="immersive"
        checkTimesLabel={checkTimesLabel}
      />
      <div className="pub-home__immersive-body">
        {config.sections.map((section) => (
          <div key={section.id}>{renderPublicSection(section, locale, "immersive")}</div>
        ))}
      </div>
    </main>
  );
}

export async function PublicSitePage({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = await getTranslations("public.home");
  const checkTimesLabel = t("checkTimes", {
    checkIn: config.checkInTime,
    checkOut: config.checkOutTime,
  });

  switch (config.templateId) {
    case "editorial":
      return (
        <EditorialPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
        />
      );
    case "immersive":
      return (
        <ImmersivePublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
        />
      );
    case "classic":
    default:
      return (
        <ClassicPublicTemplate
          config={config}
          locale={locale}
          checkTimesLabel={checkTimesLabel}
        />
      );
  }
}

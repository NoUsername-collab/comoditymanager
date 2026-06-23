"use client";

import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { safeCssUrl, safeNavHref } from "@/lib/security/html-escape";
import type { PublicHeroConfig, PublicSiteConfig } from "@/features/public-site/domain/types";

export function PublicHeroBlock({
  config,
  locale,
  variant,
  checkTimesLabel,
  preview = false,
}: {
  config: Pick<PublicSiteConfig, "hero" | "displayName" | "bookingEnabled">;
  locale: string;
  variant: "classic" | "editorial" | "immersive";
  checkTimesLabel?: string;
  /** Disables navigation in admin live preview */
  preview?: boolean;
}) {
  const hero = config.hero;
  const title = pickLocalized(hero.title, locale, [config.displayName]);
  const subtitle = pickLocalized(hero.subtitle, locale);
  const tagline = pickLocalized(hero.tagline, locale);
  const badge = pickLocalized(hero.badge, locale);
  const ctaPrimary = pickLocalized(hero.ctaPrimary, locale);
  const ctaSecondary = pickLocalized(hero.ctaSecondary, locale);

  const primaryBtn =
    config.bookingEnabled && ctaPrimary ? (
      preview ? (
        <span className="pub-btn pub-btn--primary">{ctaPrimary}</span>
      ) : (
        <Link href={safeNavHref(hero.ctaPrimaryHref, "/calendar")} className="pub-btn pub-btn--primary">
          {ctaPrimary}
        </Link>
      )
    ) : null;

  const secondaryBtn = ctaSecondary ? (
    preview ? (
      <span className="pub-btn pub-btn--ghost">{ctaSecondary}</span>
    ) : (
      <Link href={safeNavHref(hero.ctaSecondaryHref, "#public-intro")} className="pub-btn pub-btn--ghost">
        {ctaSecondary}
      </Link>
    )
  ) : null;

  return (
    <section className={`pub-hero pub-hero--${variant}`}>
      <div className="pub-hero__glow" aria-hidden />
      {hero.imageUrl ? (
        <div
          className="pub-hero__media"
          style={{ backgroundImage: `url(${safeCssUrl(hero.imageUrl)})` }}
          aria-hidden
        />
      ) : null}
      <div className="pub-hero__inner">
        {badge ? <p className="pub-hero__badge">{badge}</p> : null}
        <h1 className="pub-hero__title">{title}</h1>
        {subtitle ? <p className="pub-hero__subtitle">{subtitle}</p> : null}
        {tagline ? <p className="pub-hero__tagline">{tagline}</p> : null}
        {checkTimesLabel && hero.showCheckTimes !== false ? (
          <p className="pub-hero__meta">{checkTimesLabel}</p>
        ) : null}
        {primaryBtn || secondaryBtn ? (
          <div className="pub-hero__actions">
            {primaryBtn}
            {secondaryBtn}
          </div>
        ) : null}
      </div>
    </section>
  );
}

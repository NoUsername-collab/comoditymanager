"use client";

import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { safeCssUrl, safeNavHref } from "@/lib/security/html-escape";
import type { PublicSiteConfig, PublicTemplateId } from "@/features/public-site/domain/types";
import type { ReactNode } from "react";

type HeroProps = {
  config: Pick<PublicSiteConfig, "hero" | "displayName" | "bookingEnabled">;
  locale: string;
  variant: PublicTemplateId;
  checkTimesLabel?: string;
  preview?: boolean;
};

function PreviewOrLink({
  preview,
  href,
  className,
  children,
}: {
  preview: boolean;
  href: string;
  className: string;
  children: ReactNode;
}) {
  if (preview) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function PublicHeroBlock({
  config,
  locale,
  variant,
  checkTimesLabel,
  preview = false,
}: HeroProps) {
  const hero = config.hero;
  const title = pickLocalized(hero.title, locale, [config.displayName]);
  const subtitle = pickLocalized(hero.subtitle, locale);
  const tagline = pickLocalized(hero.tagline, locale);
  const badge = pickLocalized(hero.badge, locale);
  const ctaPrimary = pickLocalized(hero.ctaPrimary, locale);
  const ctaSecondary = pickLocalized(hero.ctaSecondary, locale);
  const showMeta = Boolean(checkTimesLabel) && hero.showCheckTimes !== false;

  const primaryBtn =
    config.bookingEnabled && ctaPrimary ? (
      <PreviewOrLink
        preview={preview}
        href={safeNavHref(hero.ctaPrimaryHref, "/calendar")}
        className="pub-btn pub-btn--primary"
      >
        {ctaPrimary}
      </PreviewOrLink>
    ) : null;

  const secondaryBtn = ctaSecondary ? (
    <PreviewOrLink
      preview={preview}
      href={safeNavHref(hero.ctaSecondaryHref, "#public-intro")}
      className={
        variant === "immersive" ? "pub-hero__text-link" : "pub-btn pub-btn--ghost"
      }
    >
      {ctaSecondary}
    </PreviewOrLink>
  ) : null;

  if (variant === "editorial") {
    return (
      <section className="pub-hero pub-hero--editorial">
        <div className="pub-hero__copy">
          {badge ? <p className="pub-hero__kicker">{badge}</p> : null}
          <h1 className="pub-hero__title">{title}</h1>
          {subtitle ? <p className="pub-hero__subtitle">{subtitle}</p> : null}
          {tagline ? <p className="pub-hero__dek">{tagline}</p> : null}
        </div>
        <div className="pub-hero__portrait">
          {hero.imageUrl ? (
            <div
              className="pub-hero__media"
              style={{ backgroundImage: `url(${safeCssUrl(hero.imageUrl)})` }}
              aria-hidden
            />
          ) : (
            <div className="pub-hero__poster" aria-hidden>
              <span>{config.displayName}</span>
            </div>
          )}
        </div>
        <aside className="pub-hero__rail">
          {showMeta ? <p className="pub-hero__meta">{checkTimesLabel}</p> : null}
          {primaryBtn || secondaryBtn ? (
            <div className="pub-hero__actions pub-hero__actions--stack">
              {primaryBtn}
              {secondaryBtn}
            </div>
          ) : null}
        </aside>
      </section>
    );
  }

  if (variant === "immersive") {
    return (
      <section
        className={[
          "pub-hero",
          "pub-hero--immersive",
          hero.imageUrl ? "pub-hero--has-media" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hero.imageUrl ? (
          <div
            className="pub-hero__media"
            style={{ backgroundImage: `url(${safeCssUrl(hero.imageUrl)})` }}
            aria-hidden
          />
        ) : (
          <div className="pub-hero__glow" aria-hidden />
        )}
        <div className="pub-hero__veil" aria-hidden />
        <div className="pub-hero__inner">
          {badge ? <p className="pub-hero__badge">{badge}</p> : null}
          <h1 className="pub-hero__title">{title}</h1>
          {subtitle ? <p className="pub-hero__subtitle">{subtitle}</p> : null}
          {showMeta ? <p className="pub-hero__meta">{checkTimesLabel}</p> : null}
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

  return (
    <section
      className={[
        "pub-hero",
        "pub-hero--classic",
        hero.imageUrl ? "pub-hero--has-photo" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hero.imageUrl ? (
        <figure className="pub-hero__photo">
          <div
            className="pub-hero__media"
            style={{ backgroundImage: `url(${safeCssUrl(hero.imageUrl)})` }}
            aria-hidden
          />
        </figure>
      ) : (
        <div className="pub-hero__glow" aria-hidden />
      )}
      <div className="pub-hero__inner">
        {badge ? <p className="pub-hero__badge">{badge}</p> : null}
        <h1 className="pub-hero__title">{title}</h1>
        {subtitle ? <p className="pub-hero__subtitle">{subtitle}</p> : null}
        {tagline ? <p className="pub-hero__tagline">{tagline}</p> : null}
        {showMeta ? <p className="pub-hero__meta">{checkTimesLabel}</p> : null}
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

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import { anchoredSectionType, PUBLIC_STEPS_HREF } from "@/features/public-site/domain/anchors";
import { findSection } from "@/features/public-site/domain/order-sections";
import type { PublicSiteConfig, PublicTemplateId } from "@/features/public-site/domain/types";
import type { ReactNode } from "react";

type HeroProps = {
  config: Pick<PublicSiteConfig, "hero" | "displayName" | "bookingEnabled" | "sections">;
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

/**
 * The hero photo is the page's largest image: served resized for the screen and
 * fetched first. Described when the operator says what it shows; otherwise
 * decorative, the title beside it naming the place.
 */
function HeroMedia({ url, sizes, alt }: { url: string; sizes: string; alt: string }) {
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      loading="eager"
      fetchPriority="high"
      unoptimized={!isOptimizablePublicImageUrl(url)}
      className="pub-hero__media"
    />
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
  const title = storedTitle(hero.title, locale, config.displayName);
  const subtitle = pickOwnLocalized(hero.subtitle, locale);
  const tagline = pickOwnLocalized(hero.tagline, locale);
  const badge = pickOwnLocalized(hero.badge, locale);
  const imageAlt = pickOwnLocalized(hero.imageAlt, locale);
  const ctaPrimary = pickOwnLocalized(hero.ctaPrimary, locale);
  const ctaSecondary = pickOwnLocalized(hero.ctaSecondary, locale);
  const secondaryHref = safeNavHref(hero.ctaSecondaryHref, PUBLIC_STEPS_HREF);
  const secondaryTarget = anchoredSectionType(secondaryHref);
  const secondaryLands =
    !secondaryTarget || Boolean(findSection(config.sections, secondaryTarget, { visibleOnly: true }));
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

  const secondaryBtn = ctaSecondary && secondaryLands ? (
    <PreviewOrLink
      preview={preview}
      href={secondaryHref}
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
          {showMeta || primaryBtn || secondaryBtn ? (
            <div className="pub-hero__rail">
              {showMeta ? <p className="pub-hero__meta">{checkTimesLabel}</p> : null}
              {primaryBtn || secondaryBtn ? (
                <div className="pub-hero__actions">
                  {primaryBtn}
                  {secondaryBtn}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="pub-hero__portrait">
          {hero.imageUrl ? (
            <HeroMedia url={hero.imageUrl} alt={imageAlt} sizes="(min-width: 900px) 50vw, 100vw" />
          ) : (
            <div className="pub-hero__poster" aria-hidden>
              <span>{config.displayName}</span>
            </div>
          )}
        </div>
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
          <HeroMedia url={hero.imageUrl} alt={imageAlt} sizes="100vw" />
        ) : (
          <div className="pub-hero__glow" aria-hidden />
        )}
        <div className="pub-hero__veil" aria-hidden />
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
          <HeroMedia url={hero.imageUrl} alt={imageAlt} sizes="(max-width: 74rem) 100vw, 72rem" />
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

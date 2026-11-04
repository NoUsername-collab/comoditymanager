import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import {
  PUBLIC_INTRO_ANCHOR,
  PUBLIC_STEPS_ANCHOR,
} from "@/features/public-site/domain/anchors";
import type {
  LocalizedText,
  PublicSiteSection,
  PublicSiteSectionOf,
  PublicTemplateId,
} from "@/features/public-site/domain/types";
import { PublicBenefitIcon } from "@/features/public-site/ui/PublicBenefitIcon";

function copy(value: LocalizedText | string | null | undefined, locale: string): string {
  return pickOwnLocalized(value, locale);
}

function SectionShell({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={["pub-section", className].filter(Boolean).join(" ")}>
      <div className="pub-section__inner">{children}</div>
    </section>
  );
}

function SectionHead({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      {title ? <h2 className="pub-section__title">{title}</h2> : null}
      {lead ? <p className="pub-section__lead">{lead}</p> : null}
    </>
  );
}

/*
 * One renderer per section type. Each returns null when the section has nothing
 * to show, so the page leaves no empty wrapper behind (layouts style by position).
 */

function renderIntro(
  section: PublicSiteSectionOf<"intro">,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const body = copy(section.payload.body, locale);
  if (!title && !lead && !body) return null;
  return (
    <SectionShell
      id={PUBLIC_INTRO_ANCHOR}
      className={["pub-section--intro", template === "immersive" ? "pub-section--intro-card" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <SectionHead title={title} lead={lead} />
      {body ? <div className="pub-section__body">{body}</div> : null}
    </SectionShell>
  );
}

function renderBenefits(
  section: PublicSiteSectionOf<"benefits">,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item, index) => ({
      key: `${item.icon ?? "benefit"}-${index}`,
      icon: item.icon,
      title: copy(item.title, locale),
      text: copy(item.text, locale),
    }))
    .filter((item) => item.title || item.text);
  if (!title && !lead && items.length === 0) return null;
  return (
    <SectionShell className="pub-section--benefits">
      <SectionHead title={title} lead={lead} />
      {items.length > 0 ? (
        <div className={`pub-benefits pub-benefits--${template}`}>
          {items.map((item) => (
            <article key={item.key} className="pub-benefit">
              <PublicBenefitIcon icon={item.icon} />
              {item.title ? <h3 className="pub-benefit__title">{item.title}</h3> : null}
              {item.text ? <p className="pub-benefit__text">{item.text}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}

function renderGallery(
  section: PublicSiteSectionOf<"gallery">,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  const items = section.payload.items ?? [];
  if (items.length === 0) return null;
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  return (
    <SectionShell
      className={["pub-section--gallery", template === "immersive" ? "pub-section--gallery-bleed" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <SectionHead title={title} lead={lead} />
      <div className={`pub-gallery pub-gallery--${template}`}>
        {items.map((item) => {
          const caption = copy(item.caption, locale);
          return (
            <figure key={item.id} className="pub-gallery__item">
              <Image
                src={item.url}
                alt={caption}
                width={800}
                height={600}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="pub-gallery__img"
                loading="lazy"
                unoptimized={!isOptimizablePublicImageUrl(item.url)}
              />
              {caption ? <figcaption>{caption}</figcaption> : null}
            </figure>
          );
        })}
      </div>
    </SectionShell>
  );
}

function renderSteps(
  section: PublicSiteSectionOf<"steps">,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item, index) => ({
      key: `step-${index}`,
      title: copy(item.title, locale),
      text: copy(item.text, locale),
    }))
    .filter((item) => item.title || item.text);
  if (!title && !lead && items.length === 0) return null;
  return (
    <SectionShell id={PUBLIC_STEPS_ANCHOR} className="pub-section--steps">
      <SectionHead title={title} lead={lead} />
      {items.length > 0 ? (
        <div className={`pub-steps pub-steps--${template}`}>
          {items.map((item, index) => (
            <article key={item.key} className="pub-step">
              <span className="pub-step__num">{index + 1}</span>
              {item.title ? <h3 className="pub-step__title">{item.title}</h3> : null}
              {item.text ? <p className="pub-step__text">{item.text}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </SectionShell>
  );
}

function renderText(section: PublicSiteSectionOf<"text">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const body = copy(section.payload.body, locale);
  if (!title && !lead && !body) return null;
  return (
    <SectionShell className="pub-section--text">
      <SectionHead title={title} lead={lead} />
      {body ? <div className="pub-section__body">{body}</div> : null}
    </SectionShell>
  );
}

function renderCta(section: PublicSiteSectionOf<"cta">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const label = copy(section.payload.ctaLabel, locale);
  if (!title && !lead && !label) return null;
  return (
    <SectionShell className="pub-section--cta">
      <div className="pub-cta-band">
        {title ? <h2 className="pub-cta-band__title">{title}</h2> : null}
        {lead ? <p className="pub-cta-band__text">{lead}</p> : null}
        {label ? (
          <Link
            href={safeNavHref(section.payload.ctaHref, "/calendar")}
            className="pub-btn pub-btn--primary"
          >
            {label}
          </Link>
        ) : null}
      </div>
    </SectionShell>
  );
}

/** A section's markup, or null when it is hidden or has nothing to show. */
export function renderPublicSection(
  section: PublicSiteSection,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  if (!section.visible) return null;
  switch (section.sectionType) {
    case "intro":
      return renderIntro(section, locale, template);
    case "benefits":
      return renderBenefits(section, locale, template);
    case "gallery":
      return renderGallery(section, locale, template);
    case "steps":
      return renderSteps(section, locale, template);
    case "text":
      return renderText(section, locale);
    case "cta":
      return renderCta(section, locale);
  }
}

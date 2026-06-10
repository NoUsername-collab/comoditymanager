import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/public-site/domain/localized";
import type {
  PublicBenefitItem,
  PublicGalleryItem,
  PublicSiteSection,
  PublicStepItem,
} from "@/features/public-site/domain/types";

function SectionShell({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={["pub-section", className].filter(Boolean).join(" ")}>
      <div className="pub-section__inner">{children}</div>
    </section>
  );
}

export function renderPublicSection(
  section: PublicSiteSection,
  locale: string,
  template: "classic" | "editorial" | "immersive"
) {
  if (!section.visible) return null;

  const title = pickLocalized(section.payload.title, locale);
  const lead = pickLocalized(section.payload.lead, locale);

  switch (section.sectionType) {
    case "intro":
      return (
        <SectionShell id="public-intro" className="pub-section--intro">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          {section.payload.body ? (
            <div className="pub-section__body">
              {pickLocalized(section.payload.body, locale)}
            </div>
          ) : null}
        </SectionShell>
      );

    case "benefits": {
      const items = (section.payload.items ?? []) as PublicBenefitItem[];
      return (
        <SectionShell className="pub-section--benefits">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          <div className={`pub-benefits pub-benefits--${template}`}>
            {items.map((item, index) => (
              <article key={`${pickLocalized(item.title, locale)}-${index}`} className="pub-benefit">
                {item.icon ? (
                  <div className="pub-benefit__icon" aria-hidden>
                    {item.icon}
                  </div>
                ) : null}
                <h3 className="pub-benefit__title">{pickLocalized(item.title, locale)}</h3>
                <p className="pub-benefit__text">{pickLocalized(item.text, locale)}</p>
              </article>
            ))}
          </div>
        </SectionShell>
      );
    }

    case "gallery": {
      const items = (section.payload.items ?? []) as PublicGalleryItem[];
      if (items.length === 0) return null;
      return (
        <SectionShell className="pub-section--gallery">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          <div className={`pub-gallery pub-gallery--${template}`}>
            {items.map((item) => (
              <figure key={item.id} className="pub-gallery__item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={pickLocalized(item.caption, locale, [item.category ?? ""])} loading="lazy" />
                {pickLocalized(item.caption, locale) ? (
                  <figcaption>{pickLocalized(item.caption, locale)}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </SectionShell>
      );
    }

    case "steps": {
      const items = (section.payload.items ?? []) as PublicStepItem[];
      return (
        <SectionShell id="cum-functioneaza" className="pub-section--steps">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          <div className={`pub-steps pub-steps--${template}`}>
            {items.map((item, index) => (
              <article key={`${pickLocalized(item.title, locale)}-${index}`} className="pub-step">
                <span className="pub-step__num">{index + 1}</span>
                <h3 className="pub-step__title">{pickLocalized(item.title, locale)}</h3>
                <p className="pub-step__text">{pickLocalized(item.text, locale)}</p>
              </article>
            ))}
          </div>
        </SectionShell>
      );
    }

    case "text":
      return (
        <SectionShell className="pub-section--text">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          {section.payload.body ? (
            <div className="pub-section__body">
              {pickLocalized(section.payload.body, locale)}
            </div>
          ) : null}
        </SectionShell>
      );

    case "cta":
      return (
        <SectionShell className="pub-section--cta">
          <div className="pub-cta-band">
            {title ? <h2 className="pub-cta-band__title">{title}</h2> : null}
            {lead ? <p className="pub-cta-band__text">{lead}</p> : null}
            {section.payload.ctaLabel ? (
              <Link
                href={section.payload.ctaHref ?? "/calendar"}
                className="pub-btn pub-btn--primary"
              >
                {pickLocalized(section.payload.ctaLabel, locale)}
              </Link>
            ) : null}
          </div>
        </SectionShell>
      );

    default:
      return null;
  }
}

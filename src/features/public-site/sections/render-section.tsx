import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { pickOwnLocalized } from "@/features/public-site/domain/localized";
import { safeNavHref } from "@/lib/security/html-escape";
import type {
  LocalizedText,
  PublicBenefitItem,
  PublicGalleryItem,
  PublicSiteSection,
  PublicStepItem,
} from "@/features/public-site/domain/types";
import { PublicBenefitIcon } from "@/features/public-site/ui/PublicBenefitIcon";

function copy(
  value: LocalizedText | string | null | undefined,
  locale: string,
): string {
  return pickOwnLocalized(value, locale);
}

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
  template: "classic" | "editorial" | "immersive",
) {
  if (!section.visible) return null;

  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const body = copy(section.payload.body, locale);

  switch (section.sectionType) {
    case "intro":
      if (!title && !lead && !body) return null;
      return (
        <SectionShell
          id="public-intro"
          className={[
            "pub-section--intro",
            template === "immersive" ? "pub-section--intro-card" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          {body ? <div className="pub-section__body">{body}</div> : null}
        </SectionShell>
      );

    case "benefits": {
      const items = ((section.payload.items ?? []) as PublicBenefitItem[])
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
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
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

    case "gallery": {
      const items = (section.payload.items ?? []) as PublicGalleryItem[];
      if (items.length === 0) return null;
      return (
        <SectionShell
          className={[
            "pub-section--gallery",
            template === "immersive" ? "pub-section--gallery-bleed" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
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
                  />
                  {caption ? <figcaption>{caption}</figcaption> : null}
                </figure>
              );
            })}
          </div>
        </SectionShell>
      );
    }

    case "steps": {
      const items = ((section.payload.items ?? []) as PublicStepItem[])
        .map((item, index) => ({
          key: `step-${index}`,
          title: copy(item.title, locale),
          text: copy(item.text, locale),
        }))
        .filter((item) => item.title || item.text);
      if (!title && !lead && items.length === 0) return null;
      return (
        <SectionShell id="cum-functioneaza" className="pub-section--steps">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
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

    case "text":
      if (!title && !lead && !body) return null;
      return (
        <SectionShell className="pub-section--text">
          {title ? <h2 className="pub-section__title">{title}</h2> : null}
          {lead ? <p className="pub-section__lead">{lead}</p> : null}
          {body ? <div className="pub-section__body">{body}</div> : null}
        </SectionShell>
      );

    case "cta": {
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

    default:
      return null;
  }
}

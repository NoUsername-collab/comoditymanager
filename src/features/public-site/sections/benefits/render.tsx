import type { ReactNode } from "react";
import type { PublicSiteSectionOf, PublicTemplateId } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";
import { PublicBenefitIcon } from "@/features/public-site/ui/PublicBenefitIcon";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderBenefits(
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

import type { ReactNode } from "react";
import { PUBLIC_STEPS_ANCHOR } from "@/features/public-site/domain/anchors";
import type { PublicSiteSectionOf, PublicTemplateId } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderSteps(
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

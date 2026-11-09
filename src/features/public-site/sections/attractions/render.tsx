import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null without a named place, so the page leaves no empty wrapper. */
export function renderAttractions(section: PublicSiteSectionOf<"attractions">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item) => ({
      name: copy(item.name, locale),
      text: copy(item.text, locale),
      distance: item.distance?.trim() ?? "",
    }))
    .filter((item) => item.name);
  if (items.length === 0) return null;
  return (
    <SectionShell className="pub-section--attractions">
      <SectionHead title={title} lead={lead} />
      <ul className="pub-attractions">
        {items.map((item, index) => (
          <li key={index} className="pub-attraction">
            <div className="pub-attraction__head">
              <h3 className="pub-attraction__name">{item.name}</h3>
              {item.distance ? <span className="pub-attraction__distance">{item.distance}</span> : null}
            </div>
            {item.text ? <p className="pub-attraction__text">{item.text}</p> : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

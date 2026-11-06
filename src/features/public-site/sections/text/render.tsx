import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderText(section: PublicSiteSectionOf<"text">, locale: string): ReactNode {
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

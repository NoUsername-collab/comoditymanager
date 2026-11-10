import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { RichText } from "@/features/public-site/sections/rich-text";
import { WithSectionPhoto, withPhotoClass } from "@/features/public-site/sections/photo";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderText(section: PublicSiteSectionOf<"text">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const body = copy(section.payload.body, locale);
  if (!title && !lead && !body) return null;
  return (
    <SectionShell className={withPhotoClass("pub-section--text", section.payload.imageUrl)}>
      <WithSectionPhoto imageUrl={section.payload.imageUrl} imageAlt={section.payload.imageAlt} locale={locale}>
        <SectionHead title={title} lead={lead} />
        {body ? <RichText text={body} className="pub-section__body" /> : null}
      </WithSectionPhoto>
    </SectionShell>
  );
}

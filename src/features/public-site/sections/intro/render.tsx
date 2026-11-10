import type { ReactNode } from "react";
import { PUBLIC_INTRO_ANCHOR } from "@/features/public-site/domain/anchors";
import type { PublicSiteSectionOf, PublicTemplateId } from "@/features/public-site/domain/types";
import { WithSectionPhoto, withPhotoClass } from "@/features/public-site/sections/photo";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderIntro(
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
      className={withPhotoClass(
        ["pub-section--intro", template === "immersive" ? "pub-section--intro-card" : ""]
          .filter(Boolean)
          .join(" "),
        section.payload.imageUrl,
      )}
    >
      <WithSectionPhoto imageUrl={section.payload.imageUrl} imageAlt={section.payload.imageAlt} locale={locale}>
        <SectionHead title={title} lead={lead} />
        {body ? <div className="pub-section__body">{body}</div> : null}
      </WithSectionPhoto>
    </SectionShell>
  );
}

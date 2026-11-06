import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { safeNavHref } from "@/lib/security/html-escape";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { SectionShell, copy } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderCta(section: PublicSiteSectionOf<"cta">, locale: string): ReactNode {
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

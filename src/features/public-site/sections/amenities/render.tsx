import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";
import { PublicBenefitIcon } from "@/features/public-site/ui/PublicBenefitIcon";

/** Null without a labelled facility, so the page leaves no empty wrapper. */
export function renderAmenities(section: PublicSiteSectionOf<"amenities">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item) => ({ icon: item.icon, label: copy(item.label, locale) }))
    .filter((item) => item.label);
  if (items.length === 0) return null;
  return (
    <SectionShell className="pub-section--amenities">
      <SectionHead title={title} lead={lead} />
      <ul className="pub-amenities">
        {items.map((item, index) => (
          <li key={index} className="pub-amenity">
            <PublicBenefitIcon icon={item.icon} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

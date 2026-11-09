import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null without a quote, so the page leaves no empty wrapper. */
export function renderReviews(section: PublicSiteSectionOf<"reviews">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item) => ({
      quote: copy(item.quote, locale),
      author: copy(item.author, locale),
      rating: item.rating,
    }))
    .filter((item) => item.quote);
  if (items.length === 0) return null;
  return (
    <SectionShell className="pub-section--reviews">
      <SectionHead title={title} lead={lead} />
      <div className="pub-reviews">
        {items.map((item, index) => (
          <figure key={index} className="pub-review">
            {item.rating ? (
              <p className="pub-review__stars" aria-label={`${item.rating}/5`}>
                {"★".repeat(item.rating)}
                <span aria-hidden>{"★".repeat(5 - item.rating)}</span>
              </p>
            ) : null}
            <blockquote className="pub-review__quote">{item.quote}</blockquote>
            {item.author ? <figcaption className="pub-review__author">{item.author}</figcaption> : null}
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

import type { ReactNode } from "react";
import { parseRichText } from "@/features/public-site/domain/rich-text";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { RichText } from "@/features/public-site/sections/rich-text";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Plain words of a formatted answer, for search engines. */
function plainAnswer(answer: string): string {
  return parseRichText(answer)
    .flatMap((block) => (block.kind === "list" ? block.items.flat() : block.content))
    .map((part) => (part.kind === "break" ? " " : "text" in part ? part.text : ""))
    .join("")
    .trim();
}

/** Null without a question that has an answer, so the page leaves no empty wrapper. */
export function renderFaq(section: PublicSiteSectionOf<"faq">, locale: string): ReactNode {
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  const items = (section.payload.items ?? [])
    .map((item) => ({ question: copy(item.question, locale), answer: copy(item.answer, locale) }))
    .filter((item) => item.question && item.answer);
  if (items.length === 0) return null;

  // FAQ rich results: search engines can show the questions under the site.
  const structured = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: plainAnswer(item.answer) },
    })),
  }).replace(/</g, "\\u003c");

  return (
    <SectionShell className="pub-section--faq">
      <SectionHead title={title} lead={lead} />
      <div className="pub-faq">
        {items.map((item, index) => (
          <details key={index} className="pub-faq__item">
            <summary className="pub-faq__question">{item.question}</summary>
            <RichText text={item.answer} className="pub-faq__answer" />
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structured }} />
    </SectionShell>
  );
}

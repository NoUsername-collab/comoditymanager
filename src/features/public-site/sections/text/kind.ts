import type { SectionKind } from "@/features/public-site/sections/kind";

/** Free text the operator adds: a title, an intro line and paragraphs. */
export const textKind: SectionKind = {
  type: "text",
  copyFields: ["title", "lead", "body"],
  progressFields: ["title", "body"],
  summaryField: "title",
  repeatable: { max: 8 },
};

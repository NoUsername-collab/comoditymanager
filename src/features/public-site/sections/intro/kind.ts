import type { SectionKind } from "@/features/public-site/sections/kind";

/** "About us": a title and a paragraph. */
export const introKind: SectionKind = {
  type: "intro",
  copyFields: ["title", "lead"],
  progressFields: ["title", "lead"],
  summaryField: "title",
};

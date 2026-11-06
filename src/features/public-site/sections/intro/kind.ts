import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";

/** "About us": a title and a paragraph. */
export const introKind: SectionKind = {
  type: "intro",
  copyFields: ["title", "lead"],
  progressFields: ["title", "lead"],
  summaryField: "title",
  seed: (copy) => ({
    visible: true,
    payload: { title: seedText(copy.introTitle), lead: seedText(copy.introLead) },
  }),
};

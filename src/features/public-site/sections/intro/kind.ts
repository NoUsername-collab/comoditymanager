import type { SectionKind } from "@/features/public-site/sections/kind";
import { sectionPhotoSettings } from "@/features/public-site/sections/photo-settings";
import { seedText } from "@/features/public-site/sections/seed";

/** "About us": a title, a paragraph and, if the operator adds one, a photo. */
export const introKind: SectionKind = {
  type: "intro",
  copyFields: ["title", "lead", "imageAlt"],
  progressFields: ["title", "lead"],
  summaryField: "title",
  settings: sectionPhotoSettings,
  seed: (copy) => ({
    visible: true,
    payload: { title: seedText(copy.introTitle), lead: seedText(copy.introLead) },
  }),
};

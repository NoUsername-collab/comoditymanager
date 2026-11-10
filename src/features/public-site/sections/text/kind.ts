import type { SectionKind } from "@/features/public-site/sections/kind";
import { sectionPhotoSettings } from "@/features/public-site/sections/photo-settings";

/** Free text the operator adds: a title, an intro line, paragraphs and an optional photo. */
export const textKind: SectionKind = {
  type: "text",
  copyFields: ["title", "lead", "body", "imageAlt"],
  progressFields: ["title", "body"],
  summaryField: "title",
  settings: sectionPhotoSettings,
  addable: { max: 8 },
  namedByTitle: true,
};

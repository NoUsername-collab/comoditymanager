import type { SectionKind } from "@/features/public-site/sections/kind";

/** Questions guests ask, each with its answer (answers take formatting). */
export const faqKind: SectionKind = {
  type: "faq",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["question", "answer"],
    progressFields: ["question", "answer"],
    max: 30,
    readStructure: () => ({}),
    newItem: () => ({}),
    starter: () => [{}, {}],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: () => ({}),
  },
  addable: { max: 1 },
};

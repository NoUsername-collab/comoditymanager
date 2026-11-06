import type { SectionKind } from "@/features/public-site/sections/kind";

/** How booking works, as numbered steps. */
export const stepsKind: SectionKind = {
  type: "steps",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["title", "text"],
    progressFields: ["title"],
    max: 12,
    readStructure: () => ({}),
    newItem: () => ({}),
    starter: () => [{}, {}, {}],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: () => ({}),
  },
};

import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";

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
  seed: (copy) => ({
    visible: true,
    payload: {
      title: seedText(copy.stepsTitle),
      lead: seedText(copy.stepsLead),
      items: [
        { title: seedText(copy.step1Title), text: seedText(copy.step1Text) },
        { title: seedText(copy.step2Title), text: seedText(copy.step2Text) },
        { title: seedText(copy.step3Title), text: seedText(copy.step3Text) },
      ],
    },
  }),
};

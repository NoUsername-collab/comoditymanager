import { normalizeBenefitIcon } from "@/features/public-site/domain/benefit-icons";
import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";

/** Highlights: an icon, a title and a sentence each. */
export const benefitsKind: SectionKind = {
  type: "benefits",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["title", "text"],
    progressFields: ["title"],
    max: 12,
    readStructure: (saved) => ({ icon: normalizeBenefitIcon(saved.icon as string | undefined) }),
    newItem: () => ({ icon: "spark" }),
    starter: () => [{ icon: "bed" }, { icon: "spark" }, { icon: "handshake" }],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: (_id, structure) => ({ icon: normalizeBenefitIcon(structure.icon) }),
  },
  seed: (copy) => ({
    visible: true,
    payload: {
      title: seedText(copy.benefitsTitle),
      lead: seedText(copy.benefitsLead),
      items: [
        { icon: "bed", title: seedText(copy.benefit1Title), text: seedText(copy.benefit1Text) },
        { icon: "spark", title: seedText(copy.benefit2Title), text: seedText(copy.benefit2Text) },
        { icon: "handshake", title: seedText(copy.benefit3Title), text: seedText(copy.benefit3Text) },
      ],
    },
  }),
};

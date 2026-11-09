import { normalizeBenefitIcon } from "@/features/public-site/domain/benefit-icons";
import type { SectionKind } from "@/features/public-site/sections/kind";

/** What the house offers, as a compact list of icon and label (Wi-Fi, parking…). */
export const amenitiesKind: SectionKind = {
  type: "amenities",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["label"],
    progressFields: ["label"],
    max: 30,
    readStructure: (saved) => ({ icon: normalizeBenefitIcon(saved.icon as string | undefined) }),
    newItem: () => ({ icon: "spark" }),
    starter: () => [{ icon: "wifi" }, { icon: "parking" }, { icon: "breakfast" }],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: (_id, structure) => ({ icon: normalizeBenefitIcon(structure.icon) }),
  },
  addable: { max: 1 },
};

import type { SectionKind } from "@/features/public-site/sections/kind";

/** Places to visit nearby: a name, a line about it and how far it is. */
export const attractionsKind: SectionKind = {
  type: "attractions",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["name", "text"],
    progressFields: ["name"],
    max: 20,
    readStructure: (saved) => ({
      distance: typeof saved.distance === "string" ? saved.distance : "",
    }),
    newItem: () => ({ distance: "" }),
    starter: () => [{ distance: "" }],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: (_id, structure) => {
      const distance = structure.distance?.trim();
      return distance ? { distance } : {};
    },
  },
  addable: { max: 1 },
};

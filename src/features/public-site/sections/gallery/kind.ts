import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";

/** Photos with optional captions; shown only once it has a photo. */
export const galleryKind: SectionKind = {
  type: "gallery",
  copyFields: ["title", "lead"],
  progressFields: [],
  items: {
    copyFields: ["caption"],
    progressFields: [],
    max: 40,
    readStructure: (saved) => ({ url: typeof saved.url === "string" ? saved.url : "" }),
    savedId: (saved) => (typeof saved.id === "string" && saved.id ? saved.id : undefined),
    newItem: () => ({ url: "" }),
    keep: (structure) => Boolean(structure.url?.trim()),
    writeStructure: (id, structure) => ({ id, url: (structure.url ?? "").trim() }),
  },
  alwaysPresent: { visible: false },
  shownOnlyWithItems: true,
  seed: (copy) => ({
    visible: false,
    payload: { title: seedText(copy.galleryTitle), lead: {}, items: [] },
  }),
};

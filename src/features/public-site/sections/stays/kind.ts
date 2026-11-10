import type { SectionKind } from "@/features/public-site/sections/kind";

/**
 * The room types, listed from the room settings with their photos from the
 * photo library; the site adds a few words to each. Rows are keyed by the room
 * type, so they follow the room settings: a type removed there drops off the
 * page, a new one appears.
 */
export const staysKind: SectionKind = {
  type: "stays",
  copyFields: ["title", "lead"],
  progressFields: [],
  items: {
    copyFields: ["text"],
    progressFields: ["text"],
    max: 100,
    readStructure: () => ({}),
    savedId: (saved) =>
      typeof saved.roomTypeId === "string" && saved.roomTypeId ? saved.roomTypeId : undefined,
    newItem: () => ({}),
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: (id) => ({ roomTypeId: id }),
  },
  settings: {
    read: (payload) => ({ showPrices: payload.showPrices === false ? "0" : "1" }),
    write: (settings) => ({ showPrices: settings.showPrices !== "0" }),
  },
  alwaysPresent: { visible: true },
  seed: () => ({ visible: true, payload: { showPrices: true } }),
};

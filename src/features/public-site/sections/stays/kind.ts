import type { SectionKind } from "@/features/public-site/sections/kind";

/**
 * The room types, listed from the room settings; the site adds a photo and a
 * few words to each. Rows are keyed by the room type, so they follow the room
 * settings: a type removed there drops off the page, a new one appears.
 */
export const staysKind: SectionKind = {
  type: "stays",
  copyFields: ["title", "lead"],
  progressFields: [],
  items: {
    copyFields: ["text"],
    progressFields: ["text"],
    max: 100,
    readStructure: (saved) => ({
      imageUrl: typeof saved.imageUrl === "string" ? saved.imageUrl : "",
    }),
    savedId: (saved) =>
      typeof saved.roomTypeId === "string" && saved.roomTypeId ? saved.roomTypeId : undefined,
    newItem: () => ({ imageUrl: "" }),
    keep: (structure, hasCopy) => hasCopy || Boolean(structure.imageUrl?.trim()),
    writeStructure: (id, structure) => {
      const imageUrl = structure.imageUrl?.trim();
      return imageUrl ? { roomTypeId: id, imageUrl } : { roomTypeId: id };
    },
  },
  settings: {
    read: (payload) => ({ showPrices: payload.showPrices === false ? "0" : "1" }),
    write: (settings) => ({ showPrices: settings.showPrices !== "0" }),
  },
  alwaysPresent: { visible: true },
  seed: () => ({ visible: true, payload: { showPrices: true } }),
};

import type { SectionKind } from "@/features/public-site/sections/kind";

/** The room types, listed from the room settings; prices can be left out. */
export const staysKind: SectionKind = {
  type: "stays",
  copyFields: [],
  progressFields: [],
  settings: {
    read: (payload) => ({ showPrices: payload.showPrices === false ? "0" : "1" }),
    write: (settings) => ({ showPrices: settings.showPrices !== "0" }),
  },
  alwaysPresent: { visible: true },
  seed: () => ({ visible: true, payload: { showPrices: true } }),
};

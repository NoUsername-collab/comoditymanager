import type { SectionKind } from "@/features/public-site/sections/kind";

/** Address and map, from the property's details. */
export const placeKind: SectionKind = {
  type: "place",
  copyFields: [],
  progressFields: [],
  alwaysPresent: { visible: true },
  seed: () => ({ visible: true, payload: {} }),
};

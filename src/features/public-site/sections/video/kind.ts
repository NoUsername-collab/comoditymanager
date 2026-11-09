import type { SectionKind } from "@/features/public-site/sections/kind";

/** A YouTube or Vimeo film, from the address the operator pastes. */
export const videoKind: SectionKind = {
  type: "video",
  copyFields: ["title", "lead"],
  progressFields: [],
  summaryField: "title",
  settings: {
    read: (payload) => ({ url: typeof payload.url === "string" ? payload.url : "" }),
    write: (settings) => ({ url: settings.url?.trim() ?? "" }),
  },
  addable: { max: 1 },
};

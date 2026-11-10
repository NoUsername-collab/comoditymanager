import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";
import { readGalleryAlbums, readGalleryLayout, readGalleryLimit } from "@/features/public-site/domain/gallery";

/**
 * Albums of the photo library, laid out as the operator picks. The photos live
 * in the library; the gallery keeps which albums, how and how many first.
 * Several galleries can sit on a page (one per album, say), told apart by title.
 */
export const galleryKind: SectionKind = {
  type: "gallery",
  copyFields: ["title", "lead"],
  progressFields: [],
  summaryField: "title",
  settings: {
    read: (payload) => ({
      albums: readGalleryAlbums(payload.albums).join(","),
      layout: readGalleryLayout(payload.layout),
      limit: String(readGalleryLimit(payload.limit)),
    }),
    write: (settings) => ({
      albums: readGalleryAlbums((settings.albums ?? "").split(",").filter(Boolean)),
      layout: readGalleryLayout(settings.layout),
      limit: readGalleryLimit(settings.limit),
    }),
  },
  addable: { max: 4 },
  namedByTitle: true,
  alwaysPresent: { visible: false },
  seed: (copy) => ({
    visible: false,
    payload: { title: seedText(copy.galleryTitle), lead: {}, albums: [], layout: "auto", limit: 9 },
  }),
};

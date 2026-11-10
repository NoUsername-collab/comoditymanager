import { describe, expect, it } from "vitest";
import {
  concreteGalleryLayout,
  galleryCategories,
  galleryPhotos,
  readGalleryAlbums,
  readGalleryLayout,
  readGalleryLimit,
} from "@/features/public-site/domain/gallery";
import type { PublicMediaPhoto } from "@/features/public-site/domain/types";

const photo = (id: string, album: string): PublicMediaPhoto => ({ id, url: id, album, alt: {}, focus: "50% 50%" });
const media = [photo("r1", "rooms"), photo("e1", "exterior"), photo("r2", "rooms"), photo("f1", "food")];

describe("gallery", () => {
  it("shows the chosen albums in the library's album order, all of them when none is chosen", () => {
    expect(galleryPhotos(media, ["rooms", "exterior"]).map((p) => p.id)).toEqual(["e1", "r1", "r2"]);
    expect(galleryPhotos(media, []).map((p) => p.id)).toEqual(["e1", "r1", "r2", "f1"]);
    expect(galleryCategories(galleryPhotos(media, []))).toEqual(["exterior", "rooms", "food"]);
  });

  it("reads only known albums, layouts and limits", () => {
    expect(readGalleryAlbums(["food", "nope", "exterior"])).toEqual(["exterior", "food"]);
    expect(readGalleryAlbums("rooms")).toEqual([]);
    expect(readGalleryLayout("mosaic")).toBe("mosaic");
    expect(readGalleryLayout("spiral")).toBe("auto");
    expect(readGalleryLimit(12)).toBe(12);
    expect(readGalleryLimit("0")).toBe(0);
    expect(readGalleryLimit(7)).toBe(9);
  });

  it("lets 'auto' follow the page layout", () => {
    expect(concreteGalleryLayout("auto", "classic")).toBe("grid");
    expect(concreteGalleryLayout("auto", "editorial")).toBe("mosaic");
    expect(concreteGalleryLayout("auto", "immersive")).toBe("carousel");
    expect(concreteGalleryLayout("feature", "classic")).toBe("feature");
  });
});

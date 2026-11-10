import { MEDIA_ALBUMS, isMediaAlbum, mediaFocus, type MediaAlbum, type MediaAsset } from "@/domain/media/types";
import {
  GALLERY_LAYOUTS,
  type GalleryLayout,
  type PublicMediaPhoto,
  type PublicTemplateId,
} from "@/features/public-site/domain/types";

/** A library photo as the public pages show it. */
export function publicMediaPhoto(asset: MediaAsset): PublicMediaPhoto {
  return { id: asset.id, url: asset.url, album: asset.album, alt: asset.alt, focus: mediaFocus(asset) };
}

/** The albums a gallery shows, as stored; empty means every album. */
export function readGalleryAlbums(raw: unknown): MediaAlbum[] {
  if (!Array.isArray(raw)) return [];
  return MEDIA_ALBUMS.filter((album) => raw.includes(album));
}

export function readGalleryLayout(raw: unknown): GalleryLayout {
  return GALLERY_LAYOUTS.includes(raw as GalleryLayout) ? (raw as GalleryLayout) : "auto";
}

/** How many photos show before "see all": 0 = all of them. */
export const GALLERY_LIMITS = [6, 9, 12, 0] as const;

export function readGalleryLimit(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return (GALLERY_LIMITS as readonly number[]).includes(n) ? n : 9;
}

/** The layout a gallery actually uses: "auto" takes the page layout's own. */
export function concreteGalleryLayout(
  layout: GalleryLayout,
  template: PublicTemplateId,
): Exclude<GalleryLayout, "auto"> {
  if (layout !== "auto") return layout;
  return template === "editorial" ? "mosaic" : template === "immersive" ? "carousel" : "grid";
}

/** The photos of the chosen albums, album by album in the library's album order. */
export function galleryPhotos(media: PublicMediaPhoto[], albums: MediaAlbum[]): PublicMediaPhoto[] {
  const wanted = MEDIA_ALBUMS.filter((album) => albums.length === 0 || albums.includes(album));
  return wanted.flatMap((album) => media.filter((photo) => photo.album === album));
}

/** Albums that have photos among these, in order: the visitor's category filter. */
export function galleryCategories(photos: PublicMediaPhoto[]): MediaAlbum[] {
  return MEDIA_ALBUMS.filter((album) => photos.some((photo) => photo.album === album && isMediaAlbum(album)));
}

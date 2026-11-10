/*
 * The property's photo library (migration 116): every photo once, with its
 * album and, for a room, its room type. The site, the booking form and the
 * guest app pick photos from here.
 */

export const MEDIA_ALBUMS = ["exterior", "rooms", "common", "area", "food", "other"] as const;
export type MediaAlbum = (typeof MEDIA_ALBUMS)[number];

export type MediaLocale = "ro" | "en" | "bg";
export type MediaText = Partial<Record<MediaLocale, string>>;

export type MediaAsset = {
  id: string;
  url: string;
  album: MediaAlbum;
  roomTypeId: string | null;
  /** What the photo shows, per language. */
  alt: MediaText;
  /** The subject's place in the photo, 0–1; crops keep it in view. */
  focalX: number;
  focalY: number;
  sortOrder: number;
};

export function isMediaAlbum(raw: unknown): raw is MediaAlbum {
  return MEDIA_ALBUMS.includes(raw as MediaAlbum);
}

function clamp01(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;
}

function text(raw: unknown): MediaText {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: MediaText = {};
  for (const locale of ["ro", "en", "bg"] as const) {
    const value = (raw as Record<string, unknown>)[locale];
    if (typeof value === "string" && value.trim()) out[locale] = value.trim();
  }
  return out;
}

export function mediaFromRow(row: Record<string, unknown>): MediaAsset {
  return {
    id: String(row.id),
    url: String(row.url),
    album: isMediaAlbum(row.album) ? row.album : "other",
    roomTypeId: typeof row.room_type_id === "string" ? row.room_type_id : null,
    alt: text(row.alt),
    focalX: clamp01(row.focal_x),
    focalY: clamp01(row.focal_y),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
  };
}

/** The photos of each room type, in their order; the first is the type's cover. */
export function photosByRoomType(assets: MediaAsset[]): Map<string, MediaAsset[]> {
  const out = new Map<string, MediaAsset[]>();
  for (const asset of [...assets].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!asset.roomTypeId) continue;
    const list = out.get(asset.roomTypeId) ?? [];
    list.push(asset);
    out.set(asset.roomTypeId, list);
  }
  return out;
}

/** The photo's description in a language, or in another one it has, or "". */
export function mediaAlt(asset: Pick<MediaAsset, "alt">, locale: string): string {
  const own = asset.alt[locale as MediaLocale];
  if (own) return own;
  return asset.alt.ro ?? asset.alt.en ?? asset.alt.bg ?? "";
}

/** CSS object-position that keeps the subject in view. */
export function mediaFocus(asset: Pick<MediaAsset, "focalX" | "focalY">): string {
  return `${Math.round(asset.focalX * 100)}% ${Math.round(asset.focalY * 100)}%`;
}

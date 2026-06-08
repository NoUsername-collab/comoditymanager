/** Valori permise de constraint-ul legacy rooms_room_type_check (pre-050). */
export const LEGACY_ROOM_TYPE_VALUES = [
  "double",
  "triple",
  "deluxe",
  "other",
] as const;

export type LegacyRoomType = (typeof LEGACY_ROOM_TYPE_VALUES)[number];

const LEGACY_SET = new Set<string>(LEGACY_ROOM_TYPE_VALUES);

/**
 * Mapează slug-ul din catalog la coloana legacy rooms.room_type.
 * După migrarea 050 (drop check), poți stoca orice slug; până atunci twin → double, rest → other.
 */
export function legacyRoomTypeFromCatalogSlug(
  slug: string | null | undefined
): LegacyRoomType {
  const normalized = slug?.trim().toLowerCase() ?? "";
  if (LEGACY_SET.has(normalized)) {
    return normalized as LegacyRoomType;
  }
  if (normalized === "twin" || normalized === "single") {
    return "double";
  }
  return "other";
}

/** Slug normalizat pentru rooms.room_type după drop constraint (migrarea 050). */
export function roomTypeSlugForDb(slug: string | null | undefined): string {
  const normalized = slug?.trim().toLowerCase() ?? "";
  return normalized || "double";
}

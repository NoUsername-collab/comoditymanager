export type TouristSheetAddressParts = {
  street: string;
  locality: string;
  county: string;
};

/** Compose the ANAF tourist-sheet address from structured fields. */
export function formatTouristSheetAddress(
  parts: TouristSheetAddressParts
): string | null {
  const street = parts.street.trim();
  const locality = parts.locality.trim();
  const county = parts.county.trim();
  if (!street && !locality && !county) return null;

  const segments: string[] = [];
  if (street) segments.push(street);
  const place = [locality, county].filter(Boolean).join(", ");
  if (place) segments.push(place);
  return segments.join(", ");
}

/** Best-effort split of legacy single-line addresses. */
export function parseTouristSheetAddress(
  raw: string | null | undefined
): TouristSheetAddressParts {
  const text = raw?.trim() ?? "";
  if (!text) return { street: "", locality: "", county: "" };

  const parts = text.split(",").map((segment) => segment.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return { street: parts[0] ?? text, locality: "", county: "" };
  }
  if (parts.length === 2) {
    return { street: parts[0]!, locality: parts[1]!, county: "" };
  }

  return {
    street: parts[0]!,
    locality: parts.slice(1, -1).join(", "),
    county: parts[parts.length - 1]!,
  };
}

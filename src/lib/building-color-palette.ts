/** Fixed palette for building color in Gantt / legend. */
export const BUILDING_COLOR_PALETTE = [
  { hex: "#2563eb", label: "Blue (cool AC)" },
  { hex: "#0891b2", label: "Turquoise" },
  { hex: "#4f46e5", label: "Indigo" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#059669", label: "Green" },
  { hex: "#ca8a04", label: "Gold" },
  { hex: "#ea580c", label: "Orange (warm)" },
  { hex: "#dc2626", label: "Red" },
  { hex: "#db2777", label: "Pink" },
  { hex: "#64748b", label: "Slate gray" },
] as const;

const ALLOWED = new Set(
  BUILDING_COLOR_PALETTE.map((c) => c.hex.toLowerCase())
);

export function defaultColorForAcMode(
  acMode: "all_rooms" | "none" | "per_room"
): string {
  if (acMode === "all_rooms") return "#2563eb";
  if (acMode === "none") return "#ea580c";
  return "#059669";
}

export function canonicalHexColor(input: string | null | undefined): string | null {
  const raw = input?.trim().toLowerCase() ?? "";
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

export function normalizeBuildingColor(input: string | null | undefined): string | null {
  const hex = canonicalHexColor(input);
  if (!hex) return null;
  return ALLOWED.has(hex) ? hex : null;
}

/** Palette color for new picks; preserve legacy hex on edit when unchanged. */
export function resolveSubmittedBuildingColor(
  rawInput: string,
  acMode: "all_rooms" | "none" | "per_room",
  existingColor?: string | null
): string {
  const hex = canonicalHexColor(rawInput);
  if (!hex) return defaultColorForAcMode(acMode);

  const normalized = normalizeBuildingColor(hex);
  if (normalized) return normalized;

  const existing = canonicalHexColor(existingColor);
  if (existing && hex === existing) return existing;

  return defaultColorForAcMode(acMode);
}

export function isAllowedBuildingColor(hex: string): boolean {
  return ALLOWED.has(hex.trim().toLowerCase());
}

/** Display color in Gantt / availability from palette or AC fallback. */
export function resolveGanttBuildingColor(
  colorHex: string | null | undefined,
  acMode: "all_rooms" | "none" | "per_room"
): string {
  return normalizeBuildingColor(colorHex) ?? defaultColorForAcMode(acMode);
}

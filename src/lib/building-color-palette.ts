/** Preset swatches. Any other #RRGGBB is also a valid building color. */
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
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

export function normalizeBuildingColor(input: string | null | undefined): string | null {
  return canonicalHexColor(input);
}

/** Any valid hex; invalid input falls back to the AC default. */
export function resolveSubmittedBuildingColor(
  rawInput: string,
  acMode: "all_rooms" | "none" | "per_room"
): string {
  return canonicalHexColor(rawInput) ?? defaultColorForAcMode(acMode);
}

export function isAllowedBuildingColor(hex: string): boolean {
  return canonicalHexColor(hex) != null;
}

/** Display color in Gantt / availability from the stored hex, or the AC default. */
const ganttColorCache = new Map<string, string>();

export function resolveGanttBuildingColor(
  colorHex: string | null | undefined,
  acMode: "all_rooms" | "none" | "per_room"
): string {
  const key = `${colorHex ?? ""}|${acMode}`;
  const cached = ganttColorCache.get(key);
  if (cached) return cached;
  const resolved =
    canonicalHexColor(colorHex) ?? defaultColorForAcMode(acMode);
  ganttColorCache.set(key, resolved);
  return resolved;
}

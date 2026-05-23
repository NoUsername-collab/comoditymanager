/** Paletă fixă pentru culoarea clădirii în Gantt / legendă */
export const BUILDING_COLOR_PALETTE = [
  { hex: "#2563eb", label: "Albastru (AC rece)" },
  { hex: "#0891b2", label: "Turcoaz" },
  { hex: "#4f46e5", label: "Indigo" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#059669", label: "Verde" },
  { hex: "#ca8a04", label: "Auriu" },
  { hex: "#ea580c", label: "Portocaliu (cald)" },
  { hex: "#dc2626", label: "Roșu" },
  { hex: "#db2777", label: "Roz" },
  { hex: "#64748b", label: "Gri ardezie" },
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

export function normalizeBuildingColor(input: string | null | undefined): string | null {
  const raw = input?.trim().toLowerCase() ?? "";
  if (!raw) return null;
  const hex = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/.test(hex)) return null;
  return ALLOWED.has(hex) ? hex : null;
}

export function isAllowedBuildingColor(hex: string): boolean {
  return ALLOWED.has(hex.trim().toLowerCase());
}

/** Culoare afișată în Gantt / disponibilitate — paletă sau implicit pe AC. */
export function resolveGanttBuildingColor(
  colorHex: string | null | undefined,
  acMode: "all_rooms" | "none" | "per_room"
): string {
  return normalizeBuildingColor(colorHex) ?? defaultColorForAcMode(acMode);
}

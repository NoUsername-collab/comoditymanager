import type { AdminTheme } from "@/lib/admin-theme";
import {
  ALL_PALETTES,
  CATALOG_PALETTES,
  SEASON_PALETTES,
} from "./definitions";
import type {
  AdminPaletteDefinition,
  AdminPaletteSettings,
  AdminPaletteSource,
  CatalogPaletteId,
  ResolvedPaletteId,
  SeasonPaletteId,
} from "./types";

export type SeasonId = SeasonPaletteId;

/** România — meteorologic simplu pe lună */
export function getCurrentSeason(date = new Date()): SeasonId {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export function getSeasonLabel(season: SeasonId): string {
  const map: Record<SeasonId, string> = {
    spring: "Primăvară",
    summer: "Vară",
    autumn: "Toamnă",
    winter: "Iarnă",
  };
  return map[season];
}

export function isCatalogPaletteId(id: string): id is CatalogPaletteId {
  return CATALOG_PALETTES.some((p) => p.id === id);
}

export function isSeasonPaletteId(id: string): id is SeasonPaletteId {
  return SEASON_PALETTES.some((p) => p.id === id);
}

export function getPaletteDefinition(
  id: ResolvedPaletteId
): AdminPaletteDefinition | undefined {
  return ALL_PALETTES.find((p) => p.id === id);
}

export function resolvePaletteId(settings: AdminPaletteSettings): ResolvedPaletteId {
  const { admin_palette_source, admin_palette_key } = settings;

  if (admin_palette_source === "season_auto") {
    return getCurrentSeason();
  }

  if (admin_palette_source === "season_manual") {
    if (isSeasonPaletteId(admin_palette_key)) return admin_palette_key;
    return getCurrentSeason();
  }

  if (isCatalogPaletteId(admin_palette_key)) return admin_palette_key;
  return "pension";
}

export function resolvePaletteDefinition(
  settings: AdminPaletteSettings
): AdminPaletteDefinition {
  const id = resolvePaletteId(settings);
  return getPaletteDefinition(id) ?? CATALOG_PALETTES[0]!;
}

export function paletteSourceLabel(source: AdminPaletteSource): string {
  if (source === "catalog") return "Paletă generală (11 stiluri)";
  if (source === "season_auto") return "Anotimp automat";
  return "Anotimp ales manual";
}

import { migrateLegacyPaletteKey, DEFAULT_THEME_ID } from "@/lib/themes";
import { CATALOG_PALETTES } from "./definitions";
import type {
  AdminPaletteDefinition,
  AdminPaletteSettings,
  CatalogPaletteId,
  ResolvedPaletteId,
} from "./types";

export function isCatalogPaletteId(id: string): id is CatalogPaletteId {
  return CATALOG_PALETTES.some((p) => p.id === id);
}

export function getPaletteDefinition(
  id: ResolvedPaletteId
): AdminPaletteDefinition | undefined {
  return CATALOG_PALETTES.find((p) => p.id === id);
}

export function resolvePaletteId(settings: AdminPaletteSettings): ResolvedPaletteId {
  return migrateLegacyPaletteKey(settings.admin_palette_key);
}

export function resolvePaletteDefinition(
  settings: AdminPaletteSettings
): AdminPaletteDefinition {
  const id = resolvePaletteId(settings);
  return getPaletteDefinition(id) ?? CATALOG_PALETTES[0]!;
}

export function paletteSourceLabel(): string {
  return "Temă modulară";
}

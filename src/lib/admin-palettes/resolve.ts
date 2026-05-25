import type { ThemeId } from "@/lib/themes";
import { CATALOG_PALETTES } from "./definitions";
import type { AdminPaletteDefinition } from "./types";

export function getPaletteDefinition(
  id: ThemeId
): AdminPaletteDefinition | undefined {
  return CATALOG_PALETTES.find((p) => p.id === id);
}

import type { AdminTheme } from "@/lib/admin-theme";
import { applyTheme } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";
import type { AdminPaletteDefinition } from "./types";

export function tokensFor(
  palette: AdminPaletteDefinition,
  theme: AdminTheme
) {
  return theme === "day" ? palette.day : palette.night;
}

/** Doar atribute HTML — CSS din src/styles/themes/ */
export function applyPaletteTokens(
  palette: AdminPaletteDefinition,
  theme: AdminTheme
): void {
  applyTheme(palette.id as ThemeId, theme);
}

export function paletteVarsForSettings(): Record<string, string> {
  return {};
}

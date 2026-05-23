import type { AdminTheme } from "@/lib/admin-theme";
import type { AdminPaletteDefinition, AdminPaletteTokens } from "./types";
import { cssVariablesBlock, tokensToCssVariables } from "./derive-surface";

export function tokensFor(
  palette: AdminPaletteDefinition,
  theme: AdminTheme
): AdminPaletteTokens {
  return theme === "day" ? palette.day : palette.night;
}

export function applyPaletteTokens(
  palette: AdminPaletteDefinition,
  theme: AdminTheme
): void {
  if (typeof document === "undefined") return;

  const tokens = tokensFor(palette, theme);
  const root = document.documentElement;
  const vars = tokensToCssVariables(tokens, theme);

  root.setAttribute("data-admin-palette", palette.id);
  root.setAttribute("data-admin-theme", theme);
  root.setAttribute("data-admin-retro", tokens.isRetro ?? "");
  root.setAttribute("data-admin-skin", tokens.skin ?? "");

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function paletteVarsForSettings(
  palette: AdminPaletteDefinition,
  theme: AdminTheme
): Record<string, string> {
  return tokensToCssVariables(tokensFor(palette, theme), theme);
}

export { cssVariablesBlock };

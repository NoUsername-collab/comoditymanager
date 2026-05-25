import type { ThemeMode } from "@/lib/themes";
import type { AdminPaletteDefinition } from "./types";

export function tokensFor(
  palette: AdminPaletteDefinition,
  mode: ThemeMode
) {
  return mode === "day" ? palette.day : palette.night;
}

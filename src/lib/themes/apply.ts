import type { ThemeId, ThemeMode } from "./types";

/** Aplică tema doar prin atribute HTML — valorile sunt în CSS. */
export function applyTheme(theme: ThemeId, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.setAttribute("data-mode", mode);
  /* Compat CSS existent până la migrare completă */
  root.setAttribute("data-admin-palette", theme);
  root.setAttribute("data-admin-theme", mode);
  root.setAttribute("data-admin-palette-source", "catalog");
  const retro = theme === "win95" ? "win95" : theme === "winxp" ? "winxp" : "";
  root.setAttribute("data-admin-retro", retro);
  window.dispatchEvent(new Event("admin-theme-change"));
}

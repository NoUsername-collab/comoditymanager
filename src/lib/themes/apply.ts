import type { ThemeId, ThemeMode } from "./types";

/** Aplică tema doar prin atribute HTML — valorile sunt în CSS. */
export function applyTheme(_theme: ThemeId, mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", "default");
  root.setAttribute("data-mode", mode);
  /* Compat CSS existent până la migrare completă */
  root.setAttribute("data-admin-palette", "default");
  root.setAttribute("data-admin-theme", mode);
  root.setAttribute("data-admin-palette-source", "catalog");
  root.removeAttribute("data-admin-retro");
  window.dispatchEvent(new Event("admin-theme-change"));
}

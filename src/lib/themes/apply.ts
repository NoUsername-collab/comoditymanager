import { applyAdminThemeToDocument } from "@/design/themes/admin";
import type { ThemeId, ThemeMode } from "./types";

/** Apply design family + day/night on <html>. */
export function applyTheme(themeId: ThemeId, mode: ThemeMode): void {
  applyAdminThemeToDocument(themeId, mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("admin-theme-change"));
  }
}

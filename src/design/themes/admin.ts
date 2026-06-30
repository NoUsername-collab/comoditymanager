import type { CSSProperties } from "react";
import { getDesignTheme, migrateDesignThemeId } from "./catalog";
import type { DesignThemeId, DesignThemeMode } from "./types";

/** Build inline CSS custom properties for admin shell (primitives + key admin aliases). */
export function adminThemeCssVars(
  themeId: DesignThemeId | string,
  mode: DesignThemeMode
): Record<string, string> {
  const id = migrateDesignThemeId(themeId);
  const t = getDesignTheme(id).admin[mode];

  return {
    "--bg": t.bg,
    "--surface": t.surface,
    "--surface-2": t.surface2,
    "--surface-3": t.surface3,
    "--border": t.border,
    "--border-strong": t.borderStrong,
    "--text": t.text,
    "--text-muted": t.textMuted,
    "--text-faint": t.textFaint,
    "--accent": t.accent,
    "--accent-hover": t.accentHover,
    "--accent-muted": t.accentMuted,
    "--admin-btn-primary-bg": t.accent,
    "--admin-btn-primary-text": mode === "night" ? t.text : "#ffffff",
    "--admin-link": t.accentHover,
  };
}

export function applyAdminThemeToDocument(
  themeId: DesignThemeId | string,
  mode: DesignThemeMode
): void {
  if (typeof document === "undefined") return;
  const id = migrateDesignThemeId(themeId);
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  root.setAttribute("data-mode", mode);
  root.setAttribute("data-admin-palette", id);
  root.setAttribute("data-admin-theme", mode);
  root.setAttribute("data-admin-palette-source", "catalog");
  root.removeAttribute("data-admin-legacy-chrome");
  root.removeAttribute("data-admin-retro");

  const vars = adminThemeCssVars(id, mode);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function adminThemeBootSnippet(): string {
  return `(function(){
    try {
      var themeRaw=localStorage.getItem("casaemil-theme-id")||localStorage.getItem("casaemil-admin-palette-key")||"noir";
      var modeRaw=localStorage.getItem("casaemil-theme-mode")||localStorage.getItem("casaemil-admin-theme")||"night";
      if(themeRaw==="default") themeRaw="noir";
      var validThemes=["noir","alpine","mediterranean","pearl","slate","forest"];
      if(!validThemes.includes(themeRaw)) themeRaw="noir";
      if(modeRaw!=="day"&&modeRaw!=="night") modeRaw="night";
      var h=document.documentElement;
      h.setAttribute("data-theme",themeRaw);
      h.setAttribute("data-mode",modeRaw);
      h.setAttribute("data-admin-palette",themeRaw);
      h.setAttribute("data-admin-theme",modeRaw);
      h.setAttribute("data-admin-palette-source","catalog");
      h.removeAttribute("data-admin-legacy-chrome");
      h.removeAttribute("data-admin-retro");
    } catch(e) {
      document.documentElement.setAttribute("data-theme","noir");
      document.documentElement.setAttribute("data-mode","night");
      document.documentElement.setAttribute("data-admin-palette","noir");
      document.documentElement.setAttribute("data-admin-theme","night");
      document.documentElement.removeAttribute("data-admin-legacy-chrome");
      document.documentElement.removeAttribute("data-admin-retro");
    }
  })();`;
}

export function publicPreviewStyle(themeId: DesignThemeId): CSSProperties {
  const t = getDesignTheme(themeId).public;
  return {
    background: t.bg,
    color: t.fg,
    borderColor: t.border,
  };
}

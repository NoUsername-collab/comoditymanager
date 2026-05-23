import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";

export type AdminTheme = "day" | "night";

export const ADMIN_THEME_STORAGE_KEY = "casaemil-admin-theme";
export const ADMIN_PALETTE_SOURCE_KEY = "casaemil-admin-palette-source";
export const ADMIN_PALETTE_KEY_KEY = "casaemil-admin-palette-key";

export function readAppearanceFromStorage(): AdminPaletteSettings {
  if (typeof window === "undefined") {
    return {
      admin_palette_source: "catalog",
      admin_palette_key: "pension",
      admin_day_night: "night",
    };
  }
  try {
    const t = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    const source = localStorage.getItem(ADMIN_PALETTE_SOURCE_KEY);
    const key = localStorage.getItem(ADMIN_PALETTE_KEY_KEY);
    return {
      admin_day_night: t === "day" || t === "night" ? t : "night",
      admin_palette_source:
        source === "catalog" ||
        source === "season_auto" ||
        source === "season_manual"
          ? source
          : "catalog",
      admin_palette_key: key && key.length > 0 ? key : "pension",
    };
  } catch {
    return {
      admin_palette_source: "catalog",
      admin_palette_key: "pension",
      admin_day_night: "night",
    };
  }
}

export function writeAppearanceToStorage(settings: AdminPaletteSettings): void {
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, settings.admin_day_night);
    localStorage.setItem(
      ADMIN_PALETTE_SOURCE_KEY,
      settings.admin_palette_source
    );
    localStorage.setItem(ADMIN_PALETTE_KEY_KEY, settings.admin_palette_key);
  } catch {
    /* ignore */
  }
}

/** Boot în app/layout.tsx <head> — atribute data-admin-* înainte de paint */
export const ADMIN_THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${ADMIN_THEME_STORAGE_KEY}");var s=localStorage.getItem("${ADMIN_PALETTE_SOURCE_KEY}");var k=localStorage.getItem("${ADMIN_PALETTE_KEY_KEY}")||"pension";var retro=k==="win95"?"win95":k==="win98"||k==="winxp"?"winxp":"";var skins=["cyberpunk","victorian","medieval","newspaper"];var skin=skins.indexOf(k)>=0?k:"";document.documentElement.setAttribute("data-admin-theme",t==="day"||t==="night"?t:"night");document.documentElement.setAttribute("data-admin-palette",k);document.documentElement.setAttribute("data-admin-palette-source",s||"catalog");document.documentElement.setAttribute("data-admin-retro",retro);document.documentElement.setAttribute("data-admin-skin",skin);}catch(e){document.documentElement.setAttribute("data-admin-theme","night");document.documentElement.setAttribute("data-admin-palette","pension");document.documentElement.setAttribute("data-admin-retro","");document.documentElement.setAttribute("data-admin-skin","");}})();`;

export function readAdminTheme(): AdminTheme {
  return readAppearanceFromStorage().admin_day_night;
}

export function writeAdminTheme(theme: AdminTheme): void {
  const current = readAppearanceFromStorage();
  writeAppearanceToStorage({ ...current, admin_day_night: theme });
  try {
    document.documentElement.setAttribute("data-admin-theme", theme);
  } catch {
    /* ignore */
  }
}

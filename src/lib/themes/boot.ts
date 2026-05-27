import { THEME_MODE_STORAGE_KEY } from "./storage";

const LEGACY_MODE_KEY = "casaemil-admin-theme";

/** Boot in <head> — no flash, runs before paint */
export const THEME_BOOT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_MODE_STORAGE_KEY}")||localStorage.getItem("${LEGACY_MODE_KEY}")||"night";if(m!=="day"&&m!=="night")m="night";var h=document.documentElement;h.setAttribute("data-theme","default");h.setAttribute("data-mode",m);h.setAttribute("data-admin-palette","default");h.setAttribute("data-admin-theme",m);h.setAttribute("data-admin-palette-source","catalog");h.removeAttribute("data-admin-retro");}catch(e){document.documentElement.setAttribute("data-theme","default");document.documentElement.setAttribute("data-mode","night");document.documentElement.setAttribute("data-admin-palette","default");document.documentElement.setAttribute("data-admin-theme","night");document.documentElement.removeAttribute("data-admin-retro");}})();`;

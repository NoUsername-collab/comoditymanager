import { THEME_STORAGE_KEY, THEME_MODE_STORAGE_KEY } from "./storage";

const LEGACY_KEY_KEY = "casaemil-admin-palette-key";
const LEGACY_MODE_KEY = "casaemil-admin-theme";

/** Boot in <head> — no flash, runs before paint */
export const THEME_BOOT_SCRIPT = `(function(){try{var LEGACY=/^(minimal|pension|ocean|forest|rose|cyberpunk|victorian|medieval|newspaper|spring|summer|autumn|winter)$/;var k=localStorage.getItem("${THEME_STORAGE_KEY}")||localStorage.getItem("${LEGACY_KEY_KEY}")||"default";var m=localStorage.getItem("${THEME_MODE_STORAGE_KEY}")||localStorage.getItem("${LEGACY_MODE_KEY}")||"night";if(LEGACY.test(k)||k==="win98")k=k==="win95"?"win95":k==="win98"?"winxp":"default";var OK=/^(default|green|blue|orange|red|win95|winxp|romania|italy|france|poland|spain)$/;if(!OK.test(k))k="default";if(m!=="day"&&m!=="night")m="night";var r=k==="win95"?"win95":k==="winxp"?"winxp":"";var h=document.documentElement;h.setAttribute("data-theme",k);h.setAttribute("data-mode",m);h.setAttribute("data-admin-palette",k);h.setAttribute("data-admin-theme",m);h.setAttribute("data-admin-palette-source","catalog");h.setAttribute("data-admin-retro",r);}catch(e){document.documentElement.setAttribute("data-theme","default");document.documentElement.setAttribute("data-mode","night");}})();`;

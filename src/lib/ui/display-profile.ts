/**
 * Viewport-based display profile (independent of UA "mobile").
 * Override per device: Settings → Visuals (localStorage).
 */

import {
  getDisplayLayoutPreference,
  type DisplayProfileId,
} from "@/lib/ui/display-layout-preference";

export type DisplayProfile = DisplayProfileId;

export type ViewportHeightTier = "tall" | "standard" | "short";

const DISPLAY_PROFILES: DisplayProfile[] = [
  "wide",
  "laptop",
  "compact-laptop",
  "narrow",
];

export function isDisplayProfile(value: string | null | undefined): value is DisplayProfile {
  return DISPLAY_PROFILES.includes(value as DisplayProfile);
}

/** Auto-detect from viewport (logical CSS pixels). */
export function resolveDisplayProfile(
  width: number,
  _height: number
): DisplayProfile {
  if (width >= 1680) return "wide";
  if (width >= 1400) return "laptop";
  if (width >= 1024) return "compact-laptop";
  return "narrow";
}

export function resolveViewportHeightTier(height: number): ViewportHeightTier {
  if (height >= 820) return "tall";
  if (height >= 680) return "standard";
  return "short";
}

export function isCompactDisplayProfile(profile: DisplayProfile): boolean {
  return profile === "compact-laptop" || profile === "narrow";
}

export function resolveEffectiveDisplayProfile(
  width: number,
  height: number
): DisplayProfile {
  const pref = typeof window !== "undefined" ? getDisplayLayoutPreference() : "auto";
  if (pref !== "auto") return pref;
  return resolveDisplayProfile(width, height);
}

export function applyDisplayProfileToDocument(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const profile = resolveEffectiveDisplayProfile(width, height);
  const heightTier = resolveViewportHeightTier(height);
  const pref =
    typeof window !== "undefined" ? getDisplayLayoutPreference() : "auto";

  root.setAttribute("data-display-profile", profile);
  root.setAttribute("data-viewport-height", heightTier);
  root.setAttribute(
    "data-display-layout-mode",
    pref === "auto" ? "auto" : "manual"
  );

  root.classList.toggle("compact-viewport", isCompactDisplayProfile(profile));
}

/**
 * Runs before first paint + on resize. Reads localStorage layout preference.
 */
export const CLIENT_LAYOUT_BOOT_SCRIPT = `(function(){try{var ua=navigator.userAgent||"";var d="desktop";if(/Android/i.test(ua))d="android";else if(/iPhone|iPod|iPad/i.test(ua))d="ios";else if(/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua))d="mobile";var r=document.documentElement;r.setAttribute("data-device",d);if(d!=="desktop")r.classList.add("touch-device");var SK="hospira-display-layout";function readPref(){try{var p=localStorage.getItem(SK);if(p==="auto")return"auto";if(p==="wide"||p==="laptop"||p==="compact-laptop"||p==="narrow")return p;}catch(e){}return"auto";}function autoP(w){if(w>=1680)return"wide";if(w>=1400)return"laptop";if(w>=1024)return"compact-laptop";return"narrow";}function profile(){var w=window.innerWidth,h=window.innerHeight;var pref=readPref();var p=pref==="auto"?autoP(w):pref;var ht=h>=820?"tall":h>=680?"standard":"short";r.setAttribute("data-display-profile",p);r.setAttribute("data-viewport-height",ht);r.setAttribute("data-display-layout-mode",pref==="auto"?"auto":"manual");var c=p==="compact-laptop"||p==="narrow";if(c)r.classList.add("compact-viewport");else r.classList.remove("compact-viewport");}profile();var t;function schedule(){clearTimeout(t);t=setTimeout(profile,80);}window.addEventListener("resize",schedule);if(window.visualViewport){window.visualViewport.addEventListener("resize",schedule);window.visualViewport.addEventListener("scroll",schedule);}window.addEventListener("storage",function(e){if(e.key===SK)profile();});}catch(e){}})();`;

export function displayProfileLabel(profile: DisplayProfile): string {
  switch (profile) {
    case "wide":
      return "Wide (≥1680px, ex. 15.6\" 1920×1080)";
    case "laptop":
      return "Laptop (1400–1679px)";
    case "compact-laptop":
      return "Compact laptop (1024–1399px, ex. 14\" 1366×768)";
    case "narrow":
      return "Narrow (<1024px)";
  }
}

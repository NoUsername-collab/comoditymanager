/**
 * Viewport-based display profile (independent of UA "mobile").
 * 14" laptops (often 1366×768) are treated as compact-laptop, not wide desktop.
 */

export type DisplayProfile = "wide" | "laptop" | "compact-laptop" | "narrow";

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

/** Classify viewport — use innerWidth/innerHeight (logical CSS pixels). */
export function resolveDisplayProfile(
  width: number,
  height: number
): DisplayProfile {
  if (width >= 1600 && height >= 750) return "wide";
  if (width >= 1400) return "laptop";
  if (width >= 1024) return "compact-laptop";
  return "narrow";
}

export function resolveViewportHeightTier(height: number): ViewportHeightTier {
  if (height >= 820) return "tall";
  if (height >= 680) return "standard";
  return "short";
}

export function applyDisplayProfileToDocument(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const profile = resolveDisplayProfile(width, height);
  const heightTier = resolveViewportHeightTier(height);

  root.setAttribute("data-display-profile", profile);
  root.setAttribute("data-viewport-height", heightTier);

  const compact =
    profile === "compact-laptop" || profile === "narrow" || heightTier === "short";
  root.classList.toggle("compact-viewport", compact);
}

/**
 * Runs before first paint + on resize / visualViewport changes.
 * Combined with device UA detection in one inline script.
 */
export const CLIENT_LAYOUT_BOOT_SCRIPT = `(function(){try{var ua=navigator.userAgent||"";var d="desktop";if(/Android/i.test(ua))d="android";else if(/iPhone|iPod|iPad/i.test(ua))d="ios";else if(/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua))d="mobile";var r=document.documentElement;r.setAttribute("data-device",d);if(d!=="desktop")r.classList.add("touch-device");function profile(){var w=window.innerWidth,h=window.innerHeight;var p="narrow";if(w>=1600&&h>=750)p="wide";else if(w>=1400)p="laptop";else if(w>=1024)p="compact-laptop";r.setAttribute("data-display-profile",p);var ht=h>=820?"tall":h>=680?"standard":"short";r.setAttribute("data-viewport-height",ht);var c=p==="compact-laptop"||p==="narrow"||ht==="short";if(c)r.classList.add("compact-viewport");else r.classList.remove("compact-viewport");}profile();var t;function schedule(){clearTimeout(t);t=setTimeout(profile,80);}window.addEventListener("resize",schedule);if(window.visualViewport){window.visualViewport.addEventListener("resize",schedule);window.visualViewport.addEventListener("scroll",schedule);}}catch(e){}})();`;

export function displayProfileLabel(profile: DisplayProfile): string {
  switch (profile) {
    case "wide":
      return "Wide (≥1600px, ex. 15.6\" 1920×1080)";
    case "laptop":
      return "Laptop (1400–1599px)";
    case "compact-laptop":
      return "Compact laptop (1024–1399px, ex. 14\" 1366×768)";
    case "narrow":
      return "Narrow (<1024px)";
  }
}

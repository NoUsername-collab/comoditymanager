/** Per-browser layout preference (Settings → Visuals). */

export type DisplayProfileId = "wide" | "laptop" | "compact-laptop" | "narrow";

export type DisplayLayoutPreference = "auto" | DisplayProfileId;

export const DISPLAY_LAYOUT_STORAGE_KEY = "hospira-display-layout";

export const DISPLAY_LAYOUT_CHANGED_EVENT = "hospira:display-layout-changed";

const MANUAL_PROFILES: DisplayProfileId[] = [
  "wide",
  "laptop",
  "compact-laptop",
  "narrow",
];

export function isDisplayProfileId(
  value: string | null | undefined
): value is DisplayProfileId {
  return MANUAL_PROFILES.includes(value as DisplayProfileId);
}

export function isDisplayLayoutPreference(
  value: string | null | undefined
): value is DisplayLayoutPreference {
  return value === "auto" || isDisplayProfileId(value);
}

export function getDisplayLayoutPreference(): DisplayLayoutPreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(DISPLAY_LAYOUT_STORAGE_KEY);
    if (raw === "auto") return "auto";
    if (isDisplayProfileId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function setDisplayLayoutPreference(pref: DisplayLayoutPreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPLAY_LAYOUT_STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(DISPLAY_LAYOUT_CHANGED_EVENT));
}

/** Matches debounce in MOBILE_LAYOUT_BOOT_SCRIPT resize handler. */
export const LAYOUT_RESIZE_DEBOUNCE_MS = 80;

/** Consistent viewport size (visualViewport when available — iOS chrome). */
export function getLayoutViewportSize(): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
}

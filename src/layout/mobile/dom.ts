import type { LayoutChrome, LayoutMode, LayoutOrientation } from "./types";

const LAYOUT_MODES: LayoutMode[] = ["mobile", "tablet", "desktop"];
const LAYOUT_ORIENTATIONS: LayoutOrientation[] = ["portrait", "landscape"];
const LAYOUT_CHROME: LayoutChrome[] = ["compact", "wide"];

export function isLayoutMode(value: string | null | undefined): value is LayoutMode {
  return LAYOUT_MODES.includes(value as LayoutMode);
}

export function isLayoutOrientation(
  value: string | null | undefined
): value is LayoutOrientation {
  return LAYOUT_ORIENTATIONS.includes(value as LayoutOrientation);
}

export function readLayoutModeFromDom(): LayoutMode {
  if (typeof document === "undefined") return "desktop";
  const attr = document.documentElement.getAttribute("data-layout-mode");
  return isLayoutMode(attr) ? attr : "desktop";
}

export function readLayoutOrientationFromDom(): LayoutOrientation {
  if (typeof document === "undefined") return "landscape";
  const attr = document.documentElement.getAttribute("data-layout-orientation");
  return isLayoutOrientation(attr) ? attr : "landscape";
}

export function isLayoutChrome(value: string | null | undefined): value is LayoutChrome {
  return LAYOUT_CHROME.includes(value as LayoutChrome);
}

export function readLayoutChromeFromDom(): LayoutChrome {
  if (typeof document === "undefined") return "wide";
  const attr = document.documentElement.getAttribute("data-layout-chrome");
  return isLayoutChrome(attr) ? attr : "wide";
}

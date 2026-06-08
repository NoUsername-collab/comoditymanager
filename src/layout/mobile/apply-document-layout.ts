import { debounce } from "@/lib/debounce";
import {
  getDisplayLayoutPreference,
  type DisplayLayoutPreference,
} from "@/lib/ui/display-layout-preference";
import {
  isCompactDisplayProfile,
  resolveViewportHeightTier,
} from "@/lib/ui/display-profile";
import {
  isDesktopLayoutMode,
  isMobileLayoutMode,
  isTabletLayoutMode,
  resolveLayoutBreakpoint,
} from "./resolve";
import { resolveDocumentLayout } from "./display-integration";
import { getLayoutViewportSize, LAYOUT_RESIZE_DEBOUNCE_MS } from "./viewport";

function setRootAttr(root: HTMLElement, name: string, value: string): void {
  if (root.getAttribute(name) !== value) {
    root.setAttribute(name, value);
  }
}

function setRootClass(root: HTMLElement, className: string, on: boolean): void {
  root.classList.toggle(className, on);
}

function applyResolvedLayoutToDom(
  layout: ReturnType<typeof resolveDocumentLayout>
): void {
  const root = document.documentElement;
  const heightTier = resolveViewportHeightTier(layout.height);
  const breakpoint = resolveLayoutBreakpoint(layout.width);
  const vvw = `${layout.width}px`;
  const vvh = `${layout.height}px`;

  setRootAttr(root, "data-display-profile", layout.displayProfile);
  setRootAttr(root, "data-viewport-height", heightTier);
  setRootAttr(
    root,
    "data-display-layout-mode",
    layout.isManualLayout ? "manual" : "auto"
  );
  setRootAttr(root, "data-layout-preference", layout.layoutPreference);
  setRootAttr(root, "data-layout-mode", layout.mode);
  setRootAttr(root, "data-layout-orientation", layout.orientation);
  setRootAttr(root, "data-layout-chrome", layout.chrome);
  setRootAttr(root, "data-layout-bp", breakpoint);
  if (root.style.getPropertyValue("--ml-vvw") !== vvw) {
    root.style.setProperty("--ml-vvw", vvw);
  }
  if (root.style.getPropertyValue("--ml-vvh") !== vvh) {
    root.style.setProperty("--ml-vvh", vvh);
  }

  setRootClass(root, "compact-viewport", isCompactDisplayProfile(layout.displayProfile));
  setRootClass(root, "layout-mobile", isMobileLayoutMode(layout.mode));
  setRootClass(root, "layout-tablet", isTabletLayoutMode(layout.mode));
  setRootClass(root, "layout-desktop", isDesktopLayoutMode(layout.mode));
  setRootClass(root, "layout-portrait", layout.orientation === "portrait");
  setRootClass(root, "layout-landscape", layout.orientation === "landscape");
  setRootClass(root, "layout-chrome-compact", layout.chrome === "compact");
  setRootClass(root, "layout-chrome-wide", layout.chrome === "wide");
  setRootClass(root, "layout-pref-narrow", layout.layoutPreference === "narrow");
  setRootClass(
    root,
    "layout-pref-desktop",
    layout.layoutPreference !== "auto" && layout.layoutPreference !== "narrow"
  );

  document.body.classList.toggle("ml-overflow-guard", layout.chrome === "compact");
}

/** Boot script sets these before React hydrates — skip redundant first apply. */
export function isDocumentLayoutBootstrapped(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  return (
    root.hasAttribute("data-layout-mode") &&
    root.hasAttribute("data-layout-chrome") &&
    root.style.getPropertyValue("--ml-vvw") !== ""
  );
}

/** Single entry: display profile + mobile layout chrome (respects Settings → Layout). */
export function applyDocumentLayout(
  preference?: DisplayLayoutPreference
): void {
  if (typeof document === "undefined") return;
  const pref = preference ?? getDisplayLayoutPreference();
  const { width, height } = getLayoutViewportSize();
  applyResolvedLayoutToDom(resolveDocumentLayout(pref, width, height));
}

let debouncedApplyDocumentLayout:
  | ReturnType<typeof debounce<(preference?: DisplayLayoutPreference) => void>>
  | undefined;

/** Debounced apply — visualViewport/resize (matches boot-script 80ms). */
export function scheduleApplyDocumentLayout(
  preference?: DisplayLayoutPreference
): void {
  if (typeof document === "undefined") return;
  if (!debouncedApplyDocumentLayout) {
    debouncedApplyDocumentLayout = debounce(
      (pref?: DisplayLayoutPreference) => applyDocumentLayout(pref),
      LAYOUT_RESIZE_DEBOUNCE_MS
    );
  }
  debouncedApplyDocumentLayout(preference);
}

/** @deprecated Use applyDocumentLayout */
export function applyLayoutModeToDocument(): void {
  applyDocumentLayout();
}

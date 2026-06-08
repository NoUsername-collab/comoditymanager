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
import { getLayoutViewportSize } from "./viewport";

function applyResolvedLayoutToDom(
  layout: ReturnType<typeof resolveDocumentLayout>
): void {
  const root = document.documentElement;
  const heightTier = resolveViewportHeightTier(layout.height);
  const breakpoint = resolveLayoutBreakpoint(layout.width);

  root.setAttribute("data-display-profile", layout.displayProfile);
  root.setAttribute("data-viewport-height", heightTier);
  root.setAttribute(
    "data-display-layout-mode",
    layout.isManualLayout ? "manual" : "auto"
  );
  root.setAttribute("data-layout-preference", layout.layoutPreference);

  root.setAttribute("data-layout-mode", layout.mode);
  root.setAttribute("data-layout-orientation", layout.orientation);
  root.setAttribute("data-layout-chrome", layout.chrome);
  root.setAttribute("data-layout-bp", breakpoint);
  root.style.setProperty("--ml-vvw", `${layout.width}px`);
  root.style.setProperty("--ml-vvh", `${layout.height}px`);

  root.classList.toggle(
    "compact-viewport",
    isCompactDisplayProfile(layout.displayProfile)
  );
  root.classList.toggle("layout-mobile", isMobileLayoutMode(layout.mode));
  root.classList.toggle("layout-tablet", isTabletLayoutMode(layout.mode));
  root.classList.toggle("layout-desktop", isDesktopLayoutMode(layout.mode));
  root.classList.toggle(
    "layout-portrait",
    layout.orientation === "portrait"
  );
  root.classList.toggle(
    "layout-landscape",
    layout.orientation === "landscape"
  );
  root.classList.toggle("layout-chrome-compact", layout.chrome === "compact");
  root.classList.toggle("layout-chrome-wide", layout.chrome === "wide");
  root.classList.toggle(
    "layout-pref-narrow",
    layout.layoutPreference === "narrow"
  );
  root.classList.toggle(
    "layout-pref-desktop",
    layout.layoutPreference !== "auto" && layout.layoutPreference !== "narrow"
  );

  document.body.classList.toggle("ml-overflow-guard", layout.chrome === "compact");
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

/** @deprecated Use applyDocumentLayout */
export function applyLayoutModeToDocument(): void {
  applyDocumentLayout();
}

import type {
  DisplayLayoutPreference,
  DisplayProfileId,
} from "@/lib/ui/display-layout-preference";
import { resolveLayoutChrome } from "./chrome";
import { resolveLayoutMode, resolveLayoutOrientation } from "./resolve";
import type { LayoutChrome, LayoutOrientation, LayoutMode } from "./types";

/**
 * Display profile from viewport — phones (min side < 640) → narrow when auto.
 */
export function resolveAutoDisplayProfile(
  width: number,
  height: number
): DisplayProfileId {
  const minSide = Math.min(width, height);
  if (minSide < 640) return "narrow";
  if (width >= 1680) return "wide";
  if (width >= 1400) return "laptop";
  if (width >= 1024) return "compact-laptop";
  return "narrow";
}

/**
 * Shell chrome: auto-detect mobile unless user forced desktop layout in settings.
 * - auto → viewport (phone / tablet portrait = compact)
 * - narrow (Îngust) → always compact mobile shell
 * - wide / laptop / compact-laptop → wide shell (desktop chrome on device)
 */
export function resolveEffectiveLayoutChrome(
  preference: DisplayLayoutPreference,
  width: number,
  height: number
): LayoutChrome {
  const minSide = Math.min(width, height);
  /* Phones always use compact shell — wide prefs apply on larger viewports only */
  if (minSide < 640) return "compact";

  if (preference === "narrow") return "compact";
  if (preference !== "auto") return "wide";

  const mode = resolveLayoutMode(width, height);
  const orientation = resolveLayoutOrientation(width, height);
  return resolveLayoutChrome(mode, orientation);
}

export function resolveEffectiveDisplayProfile(
  preference: DisplayLayoutPreference,
  width: number,
  height: number
): DisplayProfileId {
  if (preference !== "auto") return preference;
  return resolveAutoDisplayProfile(width, height);
}

export type ResolvedDocumentLayout = {
  width: number;
  height: number;
  mode: LayoutMode;
  orientation: LayoutOrientation;
  chrome: LayoutChrome;
  displayProfile: DisplayProfileId;
  layoutPreference: DisplayLayoutPreference;
  isManualLayout: boolean;
};

export function resolveDocumentLayout(
  preference: DisplayLayoutPreference,
  width: number,
  height: number
): ResolvedDocumentLayout {
  const mode = resolveLayoutMode(width, height);
  const orientation = resolveLayoutOrientation(width, height);
  return {
    width,
    height,
    mode,
    orientation,
    chrome: resolveEffectiveLayoutChrome(preference, width, height),
    displayProfile: resolveEffectiveDisplayProfile(preference, width, height),
    layoutPreference: preference,
    isManualLayout: preference !== "auto",
  };
}

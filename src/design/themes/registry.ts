import { adminThemeCssVars } from "./admin";
import { DESIGN_THEME_IDS, getDesignTheme, migrateDesignThemeId } from "./catalog";
import {
  guestAppThemeClassName,
  resolveGuestAppThemeStyle,
  type GuestAppAppearanceInput,
} from "./guest-app";
import { publicThemeClassName, resolvePublicThemeStyle } from "./public";
import type { DesignThemeId, DesignThemeMode } from "./types";

/** Surfaces that consume the shared design catalog. */
export const THEME_SURFACES = ["admin", "public", "guest-app"] as const;
export type ThemeSurface = (typeof THEME_SURFACES)[number];

export function listDesignThemes() {
  return DESIGN_THEME_IDS.map((id) => getDesignTheme(id));
}

export function assertDesignThemeId(value: string): DesignThemeId {
  return migrateDesignThemeId(value);
}

export function resolveThemeForSurface(
  surface: ThemeSurface,
  options: {
    themeId: DesignThemeId | string;
    mode?: DesignThemeMode;
    guestAppearance?: GuestAppAppearanceInput;
    publicThemeId?: DesignThemeId | string;
  },
) {
  switch (surface) {
    case "admin":
      return {
        className: undefined,
        style: adminThemeCssVars(options.themeId, options.mode ?? "night"),
      };
    case "public":
      return {
        className: publicThemeClassName(options.themeId),
        style: resolvePublicThemeStyle(options.themeId),
      };
    case "guest-app": {
      const appearance = options.guestAppearance ?? {};
      const publicThemeId = options.publicThemeId ?? options.themeId;
      return {
        className: guestAppThemeClassName(appearance, publicThemeId),
        style: resolveGuestAppThemeStyle(appearance, publicThemeId),
      };
    }
  }
}

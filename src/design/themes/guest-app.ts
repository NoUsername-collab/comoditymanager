import type { CSSProperties } from "react";
import { getDesignTheme, migrateDesignThemeId } from "./catalog";
import type { DesignThemeId } from "./types";

/** How guest app picks its design family. */
export type GuestAppThemeSource = DesignThemeId | "inherit" | "custom";

export type GuestAppAppearanceInput = {
  themeId?: GuestAppThemeSource | string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

export function parseGuestAppThemeSource(
  raw: unknown,
): GuestAppThemeSource | undefined {
  if (raw === "inherit" || raw === "custom") return raw;
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const migrated = migrateDesignThemeId(raw);
  if (migrated === raw || raw === "default") return migrated;
  if (raw === "noir" || raw === "alpine" || raw === "mediterranean" ||
      raw === "pearl" || raw === "slate" || raw === "forest") {
    return raw as DesignThemeId;
  }
  return undefined;
}

/** Resolved catalog family — never `inherit` / `custom`. */
export function resolveGuestAppThemeId(
  appearance: GuestAppAppearanceInput,
  publicThemeId: DesignThemeId | string,
): DesignThemeId {
  const source = parseGuestAppThemeSource(appearance.themeId) ?? "inherit";
  if (source === "inherit" || source === "custom") {
    return migrateDesignThemeId(publicThemeId);
  }
  return migrateDesignThemeId(source);
}

export function resolveGuestAppThemeStyle(
  appearance: GuestAppAppearanceInput,
  publicThemeId: DesignThemeId | string,
): CSSProperties & Record<string, string> {
  const themeId = resolveGuestAppThemeId(appearance, publicThemeId);
  const t = getDesignTheme(themeId).public;
  const source = parseGuestAppThemeSource(appearance.themeId) ?? "inherit";

  const primary =
    source === "custom" && appearance.primaryColor
      ? appearance.primaryColor
      : t.accent;
  const accent =
    source === "custom" && appearance.accentColor
      ? appearance.accentColor
      : t.link;

  const vars: Record<string, string> = {
    "--guest-bg": t.bg,
    "--guest-fg": t.fg,
    "--guest-muted": t.muted,
    "--guest-primary": primary,
    "--guest-accent": accent,
    "--guest-primary-fg": t.accentFg,
    "--guest-card": t.card,
    "--guest-card-elevated": t.cardElevated,
    "--guest-border": t.border,
    "--guest-header-bg": t.headerBg,
    "--guest-focus-ring": t.focusRing,
    "--guest-success": accent,
    "--guest-success-muted": `color-mix(in srgb, ${accent} 18%, ${t.card})`,
    "--guest-success-border": `color-mix(in srgb, ${accent} 55%, transparent)`,
    "--guest-warn-bg": `color-mix(in srgb, ${t.accent} 12%, ${t.card})`,
    "--guest-warn-border": `color-mix(in srgb, ${t.accent} 35%, transparent)`,
    "--guest-warn-fg": t.fg,
    "--guest-warn-muted": t.muted,
    "--guest-danger-border": "color-mix(in srgb, #ef4444 30%, transparent)",
    "--guest-danger-bg": `color-mix(in srgb, #7f1d1d 40%, ${t.card})`,
    "--guest-danger-fg": "#fecaca",
    "--guest-app-primary": primary,
    "--guest-app-accent": accent,
  };

  return {
    ...vars,
    backgroundColor: t.bg,
    color: t.fg,
  } as CSSProperties & Record<string, string>;
}

export function guestAppThemeClassName(
  appearance: GuestAppAppearanceInput,
  publicThemeId: DesignThemeId | string,
): string {
  const themeId = resolveGuestAppThemeId(appearance, publicThemeId);
  const source = parseGuestAppThemeSource(appearance.themeId) ?? "inherit";
  return [
    "guest-app",
    `guest-app--theme-${themeId}`,
    source === "custom" && "guest-app--custom-colors",
    source === "inherit" && "guest-app--inherits-public",
  ]
    .filter(Boolean)
    .join(" ");
}

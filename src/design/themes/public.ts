import type { CSSProperties } from "react";
import { getDesignTheme, migrateDesignThemeId } from "./catalog";
import type { DesignThemeId } from "./types";

/**
 * Light or dark, read from the background colour, so scrollbars and form
 * controls match every palette, including ones added later.
 */
export function publicColorScheme(bg: string): "light" | "dark" {
  const hex = /^#([0-9a-f]{6})$/i.exec(bg.trim())?.[1];
  if (!hex) return "dark";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.5 ? "light" : "dark";
}

export function resolvePublicThemeStyle(
  themeId: DesignThemeId | string
): CSSProperties & Record<string, string> {
  const id = migrateDesignThemeId(themeId);
  const t = getDesignTheme(id).public;

  const pub: Record<string, string> = {
    "--pub-bg": t.bg,
    "--pub-fg": t.fg,
    "--pub-muted": t.muted,
    "--pub-accent": t.accent,
    "--pub-accent-fg": t.accentFg,
    "--pub-header-bg": t.headerBg,
    "--pub-card": t.card,
    "--pub-card-elevated": t.cardElevated,
    "--pub-border": t.border,
    "--pub-hero-glow": t.heroGlow,
    "--pub-font-display": t.fontDisplay,
    "--pub-link": t.link,
    "--pub-focus-ring": t.focusRing,
    "--logo-img-filter": t.logoFilter,
    "--logo-img-filter-hover": t.logoFilterHover,
    "--site-bg": t.bg,
    "--site-fg": t.fg,
    "--site-muted": t.muted,
    "--site-accent": t.accent,
    "--site-accent-fg": t.accentFg,
    "--site-header-bg": t.headerBg,
    "--site-card": t.card,
    "--site-border": t.border,
    "--public-font-serif": t.fontDisplay,
  };

  return {
    ...pub,
    backgroundColor: t.bg,
    color: t.fg,
    colorScheme: publicColorScheme(t.bg),
  } as CSSProperties & Record<string, string>;
}

/** Theme class plus `pub-site--light` / `pub-site--dark`, for touches every light palette needs. */
export function publicThemeClassName(themeId: DesignThemeId | string): string {
  const id = migrateDesignThemeId(themeId);
  const scheme = publicColorScheme(getDesignTheme(id).public.bg);
  return `pub-site pub-site--theme-${id} pub-site--${scheme} site-themed`;
}

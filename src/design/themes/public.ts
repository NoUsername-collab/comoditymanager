import type { CSSProperties } from "react";
import { getDesignTheme, migrateDesignThemeId } from "./catalog";
import type { DesignThemeId } from "./types";

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
  } as CSSProperties & Record<string, string>;
}

export function publicThemeClassName(themeId: DesignThemeId | string): string {
  const id = migrateDesignThemeId(themeId);
  return `pub-site pub-site--theme-${id} site-themed`;
}

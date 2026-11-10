import type { CSSProperties } from "react";
import { getDesignTheme, migrateDesignThemeId, resolvePublicThemeStyle } from "@/design/themes";
import type { DesignThemeId } from "@/design/themes";
import type { PublicChromeConfig, PublicTemplateId } from "@/features/public-site/domain/types";
import { publicChromeFontStack } from "@/features/public-site/domain/chrome";
import {
  contrastRatio,
  normalizeBrandColor,
  readableTextOn,
} from "@/features/public-site/domain/brand-color";

export {
  publicThemeClassName,
  resolvePublicThemeStyle,
  listDesignThemes,
  THEME_SURFACES,
  type ThemeSurface,
} from "@/design/themes";

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * The site's look: the palette, then the operator's own colour and heading
 * font over it (by default the layout's suggested font, given `templateId`,
 * the layout the page actually uses). The site and the studio preview both
 * take it from here.
 */
export function resolvePublicSiteStyle(
  themeId: DesignThemeId | string,
  chrome: Pick<PublicChromeConfig, "fontId" | "accentColor">,
  templateId?: PublicTemplateId,
): CSSProperties {
  const style: Record<string, string> = { ...resolvePublicThemeStyle(themeId) };

  const font = publicChromeFontStack(chrome.fontId, templateId);
  if (font) {
    style["--pub-font-display"] = font;
    style["--public-font-serif"] = font;
  }

  const accent = normalizeBrandColor(chrome.accentColor);
  if (accent) {
    const accentFg = readableTextOn(accent);
    style["--pub-accent"] = accent;
    style["--pub-accent-fg"] = accentFg;
    style["--site-accent"] = accent;
    style["--site-accent-fg"] = accentFg;
    style["--pub-focus-ring"] = accent;
    style["--pub-hero-glow"] = hexToRgba(accent, 0.18);
    // Links are body text: they take the colour only where it reads on the page.
    const bg = getDesignTheme(migrateDesignThemeId(String(themeId))).public.bg;
    if (contrastRatio(accent, normalizeBrandColor(bg) ?? "#ffffff") >= 4.5) {
      style["--pub-link"] = accent;
    }
  }

  return style as CSSProperties;
}

/** The palette's own page background, for checking a colour against it. */
export function publicThemeBackground(themeId: DesignThemeId | string): string {
  return getDesignTheme(migrateDesignThemeId(String(themeId))).public.bg;
}

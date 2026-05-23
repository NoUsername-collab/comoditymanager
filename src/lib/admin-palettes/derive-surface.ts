import type { AdminTheme } from "@/lib/admin-theme";
import { readableOnBackground, textOnBackground } from "@/lib/gantt-stay-surface";
import type { AdminPaletteTokens } from "./types";

/** Variabile CSS complete — transformă paleta într-o „altă aplicație” */
export function tokensToCssVariables(
  tokens: AdminPaletteTokens,
  theme: AdminTheme
): Record<string, string> {
  const isDay = theme === "day";
  const retro = tokens.isRetro ?? "";
  const skin = tokens.skin ?? "";

  const glass = isDay
    ? `color-mix(in srgb, ${tokens.panelBg} 90%, transparent)`
    : `color-mix(in srgb, ${tokens.pageBg} 72%, transparent)`;

  const glassBorder = isDay
    ? `color-mix(in srgb, ${tokens.text} 12%, transparent)`
    : `color-mix(in srgb, ${tokens.hudText} 18%, transparent)`;

  const brandBg = isDay
    ? `color-mix(in srgb, ${tokens.panelBg} 94%, transparent)`
    : `color-mix(in srgb, ${tokens.pageBg} 78%, transparent)`;

  const navTabBg = isDay
    ? `color-mix(in srgb, ${tokens.panelBg} 92%, transparent)`
    : glass;

  const navActive =
    skin === "minimal"
      ? tokens.accentMuted
      : skin === "cyberpunk"
        ? `linear-gradient(90deg, ${tokens.accent} 0%, color-mix(in srgb, ${tokens.ganttLineCheckout} 80%, ${tokens.accent}) 50%, ${tokens.ganttLineCheckin} 100%)`
        : skin === "victorian" || skin === "medieval"
          ? `linear-gradient(180deg, ${tokens.ganttLineCheckout} 0%, ${tokens.accent} 55%, color-mix(in srgb, ${tokens.accent} 70%, black) 100%)`
          : skin === "newspaper"
            ? `linear-gradient(180deg, ${tokens.panelBg} 0%, ${tokens.accentMuted} 40%, ${tokens.text} 100%)`
            : `linear-gradient(135deg, ${tokens.ganttZoneCheckout} 0%, ${tokens.accentMuted} 42%, ${tokens.accent} 100%)`;

  const switchActive =
    skin === "minimal"
      ? tokens.accent
      : `linear-gradient(180deg, ${tokens.ganttZoneCheckout} 0%, ${tokens.accent} 100%)`;

  const heroBg =
    skin === "minimal" ? tokens.pageBg : `linear-gradient(130deg, ${tokens.accentMuted} 0%, ${tokens.ganttZoneCheckin} 38%, ${tokens.pageBg} 100%)`;

  const ganttShell =
    skin === "minimal"
      ? tokens.panelBg
      : `linear-gradient(180deg, ${tokens.panelBg} 0%, color-mix(in srgb, ${tokens.pageBg} 40%, ${tokens.panelBg}) 100%)`;

  const occupiedBg = isDay
    ? `color-mix(in srgb, ${tokens.accent} 12%, #fbcfe8)`
    : `color-mix(in srgb, ${tokens.accent} 22%, #881337)`;

  const occupiedText = isDay
    ? `color-mix(in srgb, ${tokens.text} 70%, #9f1239)`
    : `color-mix(in srgb, ${tokens.text} 90%, #fda4af)`;

  const fullDayBg = isDay
    ? `color-mix(in srgb, ${tokens.accent} 35%, #fb7185)`
    : `color-mix(in srgb, ${tokens.pageBg} 50%, #be123d)`;

  const cereriGrad =
    skin === "minimal"
      ? tokens.accent
      : `linear-gradient(180deg, color-mix(in srgb, ${tokens.ganttLineCheckout} 75%, white) 0%, color-mix(in srgb, ${tokens.accent} 85%, #dc2626) 100%)`;

  const fontStack =
    skin === "cyberpunk"
      ? '"Orbitron", "Share Tech Mono", ui-monospace, system-ui, sans-serif'
      : skin === "victorian"
        ? '"Cormorant Garamond", "Playfair Display", Georgia, "Times New Roman", serif'
        : skin === "medieval"
          ? '"Cinzel", "IM Fell English", Georgia, serif'
          : skin === "newspaper"
            ? '"Newsreader", "Libre Baskerville", Georgia, serif'
            : retro === "win95" || retro === "win98"
              ? '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, ui-sans-serif, sans-serif'
              : retro === "winxp"
                ? 'Tahoma, "Segoe UI", "MS Sans Serif", ui-sans-serif, sans-serif'
                : 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif';

  const radius =
    skin === "minimal"
      ? "6px"
      : skin === "cyberpunk"
      ? "2px"
      : skin === "victorian"
        ? "4px"
        : skin === "medieval" || skin === "newspaper"
          ? "0px"
          : retro === "win95" || retro === "win98"
            ? "0px"
            : retro === "winxp"
              ? "6px"
              : "0.75rem";

  const pageBg =
    retro === "win95" || retro === "win98"
      ? isDay
        ? "#008080"
        : "#004040"
      : retro === "winxp"
        ? isDay
          ? "#5a9fd4"
          : "#1a3a5c"
        : tokens.pageBg;

  const panelBg =
    retro === "win95" || retro === "win98"
      ? "#c0c0c0"
      : retro === "winxp"
        ? "#ffffff"
        : tokens.panelBg;

  const textOnPanel = readableOnBackground(panelBg, tokens.text);
  const textMutedOnPanel =
    textOnPanel === "#ffffff"
      ? `color-mix(in srgb, ${textOnPanel} 72%, #94a3b8)`
      : `color-mix(in srgb, ${textOnPanel} 55%, #71717a)`;

  const btnPrimaryText = readableOnBackground(
    tokens.accent,
    skin === "minimal"
      ? isDay
        ? "#ffffff"
        : "#18181b"
      : skin === "cyberpunk"
        ? "#050508"
        : skin === "victorian" || skin === "medieval"
          ? isDay
            ? "#fffef8"
            : tokens.panelBg
          : skin === "newspaper"
            ? isDay
              ? "#f2ede3"
              : "#e8e4d8"
            : isDay
              ? tokens.panelBg
              : tokens.hudText
  );

  return {
    "--admin-page-bg": pageBg,
    "--admin-panel-bg": panelBg,
    "--admin-panel-border": tokens.panelBorder,
    "--admin-text": textOnPanel,
    "--admin-text-muted": textMutedOnPanel,
    "--admin-text-on-panel": textOnPanel,
    "--admin-accent": tokens.accent,
    "--admin-accent-muted": tokens.accentMuted,
    "--admin-hud-gradient": tokens.hudGradient,
    "--admin-hud-text": tokens.hudText,
    "--admin-hud-eyebrow": tokens.hudEyebrow,
    "--admin-hud-overlay":
      skin === "minimal"
        ? "transparent"
        : isDay
          ? `linear-gradient(105deg, transparent 0%, color-mix(in srgb, ${tokens.accent} 8%, transparent) 45%, color-mix(in srgb, ${tokens.pageBg} 15%, transparent) 100%)`
          : `linear-gradient(105deg, color-mix(in srgb, ${tokens.pageBg} 35%, transparent) 0%, color-mix(in srgb, ${tokens.accent} 12%, transparent) 50%, transparent 100%)`,
    "--admin-hud-shadow":
      skin === "minimal"
        ? isDay
          ? "0 1px 0 #e4e4e7"
          : "0 1px 0 #27272a"
        : isDay
          ? `0 4px 24px color-mix(in srgb, ${tokens.accent} 18%, transparent)`
          : `0 8px 32px color-mix(in srgb, ${tokens.pageBg} 55%, black)`,
    "--admin-hud-brand-bg": brandBg,
    "--admin-hud-brand-border": glassBorder,
    "--admin-link": tokens.accent,
    "--admin-link-hover": `color-mix(in srgb, ${tokens.accent} 85%, black)`,
    "--admin-nav-tab-bg": navTabBg,
    "--admin-nav-tab-text": isDay ? tokens.textMuted : tokens.hudText,
    "--admin-nav-tab-hover-bg": isDay ? tokens.panelBg : `color-mix(in srgb, ${tokens.panelBg} 88%, white)`,
    "--admin-nav-active-bg": navActive,
    "--admin-nav-active-text": readableOnBackground(tokens.accent, tokens.text),
    "--admin-nav-active-shadow":
      skin === "minimal"
        ? "none"
        : `0 4px 0 color-mix(in srgb, ${tokens.accent} 55%, black), 0 8px 20px color-mix(in srgb, ${tokens.ganttZoneCheckout} 35%, transparent)`,
    "--admin-chip-bg": glass,
    "--admin-chip-border": glassBorder,
    "--admin-chip-text": isDay ? tokens.text : tokens.hudText,
    "--admin-switch-active-bg": switchActive,
    "--admin-switch-active-text": tokens.text,
    "--admin-hero-bg": heroBg,
    "--admin-hero-content-bg": brandBg,
    "--admin-hero-border": glassBorder,
    "--admin-danger-bg": occupiedBg,
    "--admin-danger-text": occupiedText,
    "--admin-danger-border": `color-mix(in srgb, ${tokens.accent} 40%, #f472b6)`,
    "--admin-full-bg": fullDayBg,
    "--admin-full-text": occupiedText,
    "--admin-cereri-grad": cereriGrad,
    "--admin-alert-bg":
      skin === "minimal"
        ? tokens.accentMuted
        : `linear-gradient(90deg, color-mix(in srgb, ${tokens.accentMuted} 80%, #fef2f2), ${tokens.panelBg}, color-mix(in srgb, ${tokens.accentMuted} 80%, #fef2f2))`,
    "--admin-alert-text": occupiedText,
    "--admin-gantt-shell-bg": ganttShell,
    "--admin-gantt-header-shadow": `0 4px 12px color-mix(in srgb, ${tokens.pageBg} 25%, transparent)`,
    "--admin-gantt-hover": `color-mix(in srgb, ${tokens.accent} 10%, transparent)`,
    "--admin-gantt-hover-ring": `color-mix(in srgb, ${tokens.accent} 28%, transparent)`,
    "--admin-gantt-today": `color-mix(in srgb, ${tokens.accent} 8%, transparent)`,
    "--admin-gantt-today-ring": `color-mix(in srgb, ${tokens.accent} 20%, transparent)`,
    "--admin-gantt-today-line": tokens.accent,
    "--admin-gantt-unassigned":
      skin === "minimal"
        ? tokens.ganttZoneCheckout
        : `linear-gradient(90deg, ${tokens.ganttZoneCheckout} 0%, ${tokens.panelBg} 55%)`,
    "--admin-gantt-cerere": tokens.ganttZoneCheckout,
    "--admin-btn-primary-bg": tokens.accent,
    "--admin-btn-primary-text": btnPrimaryText,
    "--admin-input-bg": tokens.panelBg,
    "--admin-input-border": tokens.panelBorder,
    "--admin-radius": radius,
    "--admin-font": fontStack,
    "--gantt-zone-checkout": tokens.ganttZoneCheckout,
    "--gantt-zone-clean": tokens.ganttZoneClean,
    "--gantt-zone-checkin": tokens.ganttZoneCheckin,
    "--gantt-zone-checkout-text": textOnBackground(tokens.ganttZoneCheckout),
    "--gantt-zone-clean-text": textOnBackground(tokens.ganttZoneClean),
    "--gantt-zone-checkin-text": textOnBackground(tokens.ganttZoneCheckin),
    "--gantt-line-checkout": tokens.ganttLineCheckout,
    "--gantt-line-checkin": tokens.ganttLineCheckin,
    "--dn-day-sun": tokens.ganttZoneCheckout,
    "--dn-day-sky": tokens.accent,
    "--dn-day-mint": tokens.accentMuted,
    "--dn-day-cream": tokens.panelBg,
    "--dn-night-deep": tokens.pageBg,
    "--dn-night-indigo": tokens.panelBg,
    "--dn-night-violet": tokens.accent,
    "--dn-night-moon": tokens.accentMuted,
    "--dn-twilight": `color-mix(in srgb, ${tokens.accent} 65%, ${tokens.accentMuted})`,
    "--dn-text": tokens.hudText,
    "--dn-text-muted": isDay
      ? tokens.textMuted
      : `color-mix(in srgb, ${tokens.hudText} 78%, transparent)`,
    "--dn-glass": glass,
    "--dn-glass-border": glassBorder,
  };
}

export function cssVariablesBlock(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

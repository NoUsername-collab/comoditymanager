import type { CSSProperties } from "react";
import type { GanttStaySurface } from "@/lib/gantt-stay-surface";

/** Clasă pe bară — stilizare doar prin --gs-* (vezi admin-gantt-stay-island.css). */
export const GANTT_STAY_CHROME = "gantt-stay-chrome";

/** Variabile + aliasuri --stay-* pentru globals.css (hover, tab, badge). */
export function ganttStayChromeStyle(
  surface: GanttStaySurface
): CSSProperties & Record<string, string> {
  const fg = surface.text;
  return {
    "--gs-bg": surface.fill,
    "--gs-fg": fg,
    "--gs-border": surface.border,
    "--gs-tab": surface.tabEnd,
    "--gs-badge-bg": surface.badgeBg,
    "--gs-glow": surface.glow,
    "--stay-fill": surface.fill,
    "--stay-text": fg,
    "--stay-border": surface.border,
    "--stay-tab-end": surface.tabEnd,
    "--stay-badge-bg": surface.badgeBg,
    "--stay-badge-text": fg,
    "--stay-glow": surface.glow,
  };
}

export function ganttStayChromeClass(extra = ""): string {
  return [GANTT_STAY_CHROME, extra].filter(Boolean).join(" ");
}

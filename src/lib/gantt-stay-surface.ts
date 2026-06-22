/** Culori bară Gantt — fill semantic + spine clădire (nu fill clădire). */

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function mixChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Amestec hex + hex (t = pondere a doua culoare) */
export function mixHex(base: string, withColor: string, withWeight: number): string {
  const a = parseHex(base);
  const b = parseHex(withColor);
  if (!a || !b) return base;
  const t = Math.min(1, Math.max(0, withWeight));
  const r = mixChannel(a.r, b.r, t);
  const g = mixChannel(a.g, b.g, t);
  const bl = mixChannel(a.b, b.b, t);
  return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const linear = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function textOnBackground(hex: string): "#0f172a" | "#ffffff" {
  const bg = relativeLuminance(hex);
  const onWhite = relativeLuminance("#ffffff");
  const onDark = relativeLuminance("#0f172a");
  const ratioWhite = contrastRatio(bg, onWhite);
  const ratioDark = contrastRatio(bg, onDark);
  const whiteOk = ratioWhite >= 4.5;
  const darkOk = ratioDark >= 4.5;
  if (whiteOk && !darkOk) return "#ffffff";
  if (darkOk && !whiteOk) return "#0f172a";
  return ratioWhite >= ratioDark ? "#ffffff" : "#0f172a";
}

/** Clasă CSS pentru text pe bară — nu depinde de variabile suprascrise de temă. */
export function ganttBarTextClass(text: "#0f172a" | "#ffffff"): string {
  return text === "#ffffff" ? "gantt-bar-text--light" : "gantt-bar-text--dark";
}

/** Atribut pentru reguli CSS cu prioritate peste teme (paletă). */
export function ganttStayToneAttr(
  text: "#0f172a" | "#ffffff"
): "light" | "dark" {
  return text === "#ffffff" ? "light" : "dark";
}

/** Dacă `preferred` nu contrastează cu `bg`, alege automat alb/negru. */
export function readableOnBackground(bg: string, preferred?: string): string {
  const auto = textOnBackground(bg);
  if (!preferred) return auto;
  const pref = parseHex(preferred);
  if (!pref) return auto;
  const prefHex = `#${[pref.r, pref.g, pref.b]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
  const prefLum = relativeLuminance(prefHex);
  const bgLum = relativeLuminance(bg);
  const prefIsLight = prefLum > 0.5;
  const bgIsLight = bgLum > 0.5;
  if (prefIsLight === bgIsLight) return auto;
  return preferred;
}

export function ganttStayCssVars(
  surface: GanttStaySurface
): Record<string, string> {
  return {
    "--stay-fill": surface.fill,
    "--stay-tab-end": surface.tabEnd,
    "--stay-border": surface.border,
    "--stay-text": surface.text,
    "--stay-badge-bg": surface.badgeBg,
    "--stay-badge-text": surface.badgeText,
    "--stay-glow": surface.glow,
  };
}

export type GanttStaySurface = {
  /** Fundal principal — culoarea clădirii, plin */
  fill: string;
  /** Capăt dreapta (săgeată) — aceeași familie, puțin mai închis */
  tabEnd: string;
  border: string;
  text: "#0f172a" | "#ffffff";
  badgeBg: string;
  badgeText: "#0f172a" | "#ffffff";
  glow: string;
};

export function ganttStaySurface(
  buildingColor: string | null | undefined,
  isCerere: boolean
): GanttStaySurface {
  const base = buildingColor?.trim() || (isCerere ? "#f59e0b" : "#059669");

  if (isCerere) {
    const fill = base;
    const tabEnd = mixHex(base, "#000000", 0.2);
    const border = mixHex(base, "#d97706", 0.35);
    const text = textOnBackground(fill);
    return {
      fill,
      tabEnd,
      border,
      text,
      badgeBg:
        text === "#ffffff"
          ? "rgba(255, 255, 255, 0.22)"
          : "rgba(120, 53, 15, 0.18)",
      badgeText: text,
      glow: mixHex(base, "#f59e0b", 0.4),
    };
  }

  const fill = base;
  const tabEnd = mixHex(base, "#000000", 0.2);
  const border = mixHex(base, "#000000", 0.22);
  const text = textOnBackground(fill);
  const badgeBg =
    text === "#ffffff"
      ? "rgba(255, 255, 255, 0.22)"
      : "rgba(15, 23, 42, 0.14)";
  return {
    fill,
    tabEnd,
    border,
    text,
    badgeBg,
    badgeText: text,
    glow: mixHex(base, "#ffffff", 0.25),
  };
}

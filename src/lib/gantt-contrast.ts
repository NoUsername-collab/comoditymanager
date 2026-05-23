/** Contrast text pe bare Gantt — din culoarea de fundal efectivă (post-temă). */

function channelLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminanceRgb(r: number, g: number, b: number): number {
  return (
    0.2126 * channelLinear(r) +
    0.7152 * channelLinear(g) +
    0.0722 * channelLinear(b)
  );
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LUM_WHITE = relativeLuminanceRgb(255, 255, 255);
const LUM_DARK = relativeLuminanceRgb(15, 23, 42);

/** Alege alb/negru — prioritate contrast ≥ 4.5:1 (WCAG AA text mic). */
export function pickReadableTextFromLuminance(bgLum: number): "#ffffff" | "#0f172a" {
  const onWhite = contrastRatio(bgLum, LUM_WHITE);
  const onDark = contrastRatio(bgLum, LUM_DARK);
  const whiteOk = onWhite >= 4.5;
  const darkOk = onDark >= 4.5;
  if (whiteOk && !darkOk) return "#ffffff";
  if (darkOk && !whiteOk) return "#0f172a";
  return onWhite >= onDark ? "#ffffff" : "#0f172a";
}

export function parseCssRgb(
  css: string
): { r: number; g: number; b: number } | null {
  const t = css.trim();
  if (!t || t === "transparent") return null;
  const m = t.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!m) return null;
  return {
    r: Math.round(Number(m[1])),
    g: Math.round(Number(m[2])),
    b: Math.round(Number(m[3])),
  };
}

export function pickReadableTextFromCssBackground(
  backgroundColor: string
): "#ffffff" | "#0f172a" | null {
  const rgb = parseCssRgb(backgroundColor);
  if (!rgb) return null;
  return pickReadableTextFromLuminance(
    relativeLuminanceRgb(rgb.r, rgb.g, rgb.b)
  );
}

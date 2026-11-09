/**
 * The operator's own accent colour, laid over the chosen palette: buttons,
 * links and highlights take it, with text on it kept readable.
 */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc`, `abc` or `#AABBCC` to `#aabbcc`; anything else to null. */
export function normalizeBrandColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const hex = HEX.exec(raw.trim())?.[1];
  if (!hex) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return `#${full.toLowerCase()}`;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#111111";

/** White or near-black, whichever reads better on the colour. */
export function readableTextOn(hex: string): string {
  return contrastRatio(hex, LIGHT_TEXT) >= contrastRatio(hex, DARK_TEXT) ? LIGHT_TEXT : DARK_TEXT;
}

/**
 * How the colour holds up on the page: button text always reads (it is picked
 * for the colour), but links and highlights sit on the page background, where
 * a colour too close to it fades. 3:1 is the WCAG floor for such marks.
 */
export function brandColorFadesOn(hex: string, pageBg: string): boolean {
  const bg = normalizeBrandColor(pageBg);
  if (!bg) return false;
  return contrastRatio(hex, bg) < 3;
}

/** A few starting points; any colour can be picked. */
export const BRAND_COLOR_SUGGESTIONS = [
  "#b45309",
  "#be123c",
  "#7c3aed",
  "#1d4ed8",
  "#0f766e",
  "#15803d",
  "#a16207",
  "#334155",
] as const;

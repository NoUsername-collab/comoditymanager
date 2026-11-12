import type { PublicTemplateId } from "@/features/public-site/domain/types";

/*
 * How one section looks, on top of the page layout: its own look (the way one
 * of the three layouts sets sections out), its background, its width and the
 * alignment of its heading. "auto" everywhere means "as the page does" and is
 * never stored, so a section left alone follows the page.
 */

export const SECTION_LOOKS = ["auto", "classic", "editorial", "immersive"] as const;
export const SECTION_BACKGROUNDS = ["auto", "plain", "soft", "accent", "contrast"] as const;
export const SECTION_WIDTHS = ["auto", "narrow", "wide", "full"] as const;
export const SECTION_ALIGNS = ["auto", "start", "center"] as const;

export type SectionLook = (typeof SECTION_LOOKS)[number];
export type SectionBackground = (typeof SECTION_BACKGROUNDS)[number];
export type SectionWidth = (typeof SECTION_WIDTHS)[number];
export type SectionAlign = (typeof SECTION_ALIGNS)[number];

export type SectionStyle = {
  look: SectionLook;
  background: SectionBackground;
  width: SectionWidth;
  align: SectionAlign;
};

/** As stored in a section's payload: only what differs from the page. */
export type StoredSectionStyle = Partial<Record<keyof SectionStyle, string>>;

export const SECTION_STYLE_KEYS = ["look", "background", "width", "align"] as const;

const CHOICES: { [K in keyof SectionStyle]: readonly string[] } = {
  look: SECTION_LOOKS,
  background: SECTION_BACKGROUNDS,
  width: SECTION_WIDTHS,
  align: SECTION_ALIGNS,
};

function pick<K extends keyof SectionStyle>(key: K, raw: unknown): SectionStyle[K] {
  return (CHOICES[key].includes(raw as string) ? raw : "auto") as SectionStyle[K];
}

export function readSectionStyle(raw: unknown): SectionStyle {
  const row = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    look: pick("look", row.look),
    background: pick("background", row.background),
    width: pick("width", row.width),
    align: pick("align", row.align),
  };
}

/** The style to store: "auto" values left out; null when the section follows the page entirely. */
export function writeSectionStyle(style: SectionStyle): StoredSectionStyle | null {
  const out: StoredSectionStyle = {};
  for (const key of SECTION_STYLE_KEYS) if (style[key] !== "auto") out[key] = style[key];
  return Object.keys(out).length > 0 ? out : null;
}

/** The look a section actually takes: its own, or the page layout's. */
export function sectionLook(style: SectionStyle, template: PublicTemplateId): PublicTemplateId {
  return style.look === "auto" ? template : style.look;
}

/** Editor settings keys for the style, kept apart from each kind's own settings. */
export const styleSettingKey = (key: keyof SectionStyle) => `style.${key}`;

export function styleFromSettings(settings: Record<string, string>): SectionStyle {
  return readSectionStyle(
    Object.fromEntries(SECTION_STYLE_KEYS.map((key) => [key, settings[styleSettingKey(key)]])),
  );
}

export function styleToSettings(style: SectionStyle): Record<string, string> {
  return Object.fromEntries(SECTION_STYLE_KEYS.map((key) => [styleSettingKey(key), style[key]]));
}

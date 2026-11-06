/**
 * Ids of homepage sections that buttons and menus link to (`#public-intro`).
 * Saved links use these, so renaming one needs a data migration of stored hrefs.
 */
export const PUBLIC_INTRO_ANCHOR = "public-intro";
export const PUBLIC_STEPS_ANCHOR = "public-steps";

export const PUBLIC_INTRO_HREF = `#${PUBLIC_INTRO_ANCHOR}`;
export const PUBLIC_STEPS_HREF = `#${PUBLIC_STEPS_ANCHOR}`;

/** The homepage section a link scrolls to, or null for any other link. */
export function anchoredSectionType(href: string | null | undefined): "intro" | "steps" | null {
  const value = href?.trim();
  if (value === PUBLIC_INTRO_HREF) return "intro";
  if (value === PUBLIC_STEPS_HREF) return "steps";
  return null;
}

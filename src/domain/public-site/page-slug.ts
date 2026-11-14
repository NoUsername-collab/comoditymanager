/*
 * The address of one of the site's own pages: /<slug>, one segment. Shared by
 * the editor (which names pages) and the routing (which lets a guesthouse's own
 * domain serve them).
 */

/** Addresses the app already uses; a page cannot take them. Kept in step with migration 118. */
export const RESERVED_PAGE_SLUGS = [
  "admin",
  "api",
  "calendar",
  "confidentialitate",
  "termeni",
  "receptie",
  "guest",
  "stay",
  "landing",
  "preturi",
  "signup",
  "alpha-gate",
  "tenant-suspended",
  "platform-admin",
  "offline",
  "ro",
  "en",
  "bg",
] as const;

export const PAGE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PAGE_SLUG_MAX = 60;

/** Whether a slug can be a page's address (the shape, not whether a page has it). */
export function isPageSlugShape(slug: string): boolean {
  return (
    slug.length > 0 &&
    slug.length <= PAGE_SLUG_MAX &&
    PAGE_SLUG_PATTERN.test(slug) &&
    !(RESERVED_PAGE_SLUGS as readonly string[]).includes(slug)
  );
}

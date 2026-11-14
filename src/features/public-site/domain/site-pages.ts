import { PAGE_SLUG_MAX, PAGE_SLUG_PATTERN, RESERVED_PAGE_SLUGS } from "@/domain/public-site/page-slug";
import {
  PUBLIC_MENU_KINDS,
  type LocalizedText,
  type PublicMenuItem,
  type PublicMenuKind,
} from "@/features/public-site/domain/types";

/*
 * The site's own pages (/<slug>) and the header menu that links to them.
 */

// The address rules live with the routing, which serves the pages on a guesthouse's own domain too.
export { PAGE_SLUG_MAX, PAGE_SLUG_PATTERN, RESERVED_PAGE_SLUGS };
export const MAX_SITE_PAGES = 20;
export const MAX_MENU_ITEMS = 12;
export const MAX_MENU_CHILDREN = 10;

/** "Activități & Trasee" → "activitati-trasee". */
export function slugifyPageName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PAGE_SLUG_MAX)
    .replace(/-+$/g, "");
}

export type PageSlugProblem = "empty" | "format" | "reserved" | "taken";

/** Why a page address cannot be used, or null when it can. */
export function pageSlugProblem(slug: string, otherSlugs: readonly string[]): PageSlugProblem | null {
  if (!slug) return "empty";
  if (slug.length > PAGE_SLUG_MAX || !PAGE_SLUG_PATTERN.test(slug)) return "format";
  if ((RESERVED_PAGE_SLUGS as readonly string[]).includes(slug)) return "reserved";
  if (otherSlugs.includes(slug)) return "taken";
  return null;
}

/** A slug free on this site, from a name: "restaurant", else "restaurant-2"… */
export function freePageSlug(name: string, takenSlugs: readonly string[]): string {
  const base = slugifyPageName(name) || "pagina";
  const safe = (RESERVED_PAGE_SLUGS as readonly string[]).includes(base) ? `${base}-1` : base;
  if (!takenSlugs.includes(safe)) return safe;
  for (let n = 2; ; n += 1) {
    const next = `${safe.slice(0, PAGE_SLUG_MAX - 4)}-${n}`;
    if (!takenSlugs.includes(next)) return next;
  }
}

/** The id a section's wrapper carries, so a menu link can jump to it. */
export function sectionAnchor(sectionId: string): string {
  return `s-${sectionId.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
}

/** A menu kind that links to a page or section needs its id; a link elsewhere its address. */
export function menuKindNeedsRef(kind: PublicMenuKind): boolean {
  return kind === "page" || kind === "section" || kind === "url";
}

/** The menu a site starts with: the first page and the privacy page. */
export function defaultPublicMenu(): PublicMenuItem[] {
  return [
    { id: "home", kind: "home", label: {} },
    { id: "privacy", kind: "privacy", label: {} },
  ];
}

function asLabel(raw: unknown): LocalizedText {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: LocalizedText = {};
  for (const [locale, value] of Object.entries(raw as Record<string, unknown>)) {
    if ((locale === "ro" || locale === "en" || locale === "bg") && typeof value === "string") out[locale] = value;
  }
  return out;
}

function readItem(raw: unknown, depth: number): PublicMenuItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const kind = row.kind as PublicMenuKind;
  if (!PUBLIC_MENU_KINDS.includes(kind)) return null;
  if (typeof row.id !== "string" || !row.id) return null;
  const ref = typeof row.ref === "string" ? row.ref : undefined;
  if (menuKindNeedsRef(kind) && !ref) return null;
  const item: PublicMenuItem = { id: row.id, kind, label: asLabel(row.label) };
  if (ref && menuKindNeedsRef(kind)) item.ref = ref;
  if (depth === 0 && Array.isArray(row.children)) {
    const children = row.children
      .map((child) => readItem(child, 1))
      .filter((child): child is PublicMenuItem => child !== null && child.kind !== "group")
      .slice(0, MAX_MENU_CHILDREN);
    if (children.length > 0) item.children = children;
  }
  return item;
}

/** The stored menu, cleaned: unknown kinds dropped, one level of submenu. Missing → the default one. */
export function normalizePublicMenu(raw: unknown): PublicMenuItem[] {
  if (!Array.isArray(raw)) return defaultPublicMenu();
  return raw
    .map((item) => readItem(item, 0))
    .filter((item): item is PublicMenuItem => item !== null)
    .slice(0, MAX_MENU_ITEMS);
}

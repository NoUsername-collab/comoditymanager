import type { PublicLocale, PublicSectionType, PublicStockCopy } from "@/features/public-site/domain/types";
import type { FlatCopyKey } from "@/features/public-site/editor/model/copy-fields";
import {
  sectionTextSlots,
  setSectionSlot,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import { pageTextSlots, setPageSlot } from "@/features/public-site/editor/model/site-page-draft";
import { mapAllSections, type PublicSiteStudioDraft } from "@/features/public-site/editor/model/studio-draft";
import { sectionKind } from "@/features/public-site/sections/kinds";

/*
 * Translating side by side: every text of the site as a row, the language
 * translated from beside the one being written. Rows are the editor's own
 * fields, so a translation is the same edit as typing it in its own screen.
 */

/** Parts outside the homepage sections, in the order the screen lists them. */
const FLAT_GROUPS: { id: TranslationPart; keys: FlatCopyKey[] }[] = [
  {
    id: "hero",
    keys: [
      "heroBadge",
      "heroTitle",
      "heroSubtitle",
      "heroTagline",
      "heroCtaPrimary",
      "heroCtaSecondary",
      "heroImageAlt",
    ],
  },
  { id: "chrome", keys: ["headerSubtitle", "footerTagline", "navHome", "navPrivacy", "navTerms", "navBook"] },
  {
    id: "pages",
    keys: [
      "calendarTitle",
      "calendarLead",
      "termsTitle",
      "termsLead",
      "termsBody",
      "privacyTitle",
      "privacyLead",
      "privacyBody",
      "comingSoonTitle",
      "comingSoonLead",
    ],
  },
  {
    id: "google",
    keys: [
      "seoTitle",
      "seoDescription",
      "seoCalendarTitle",
      "seoCalendarDescription",
      "seoTermsTitle",
      "seoTermsDescription",
      "seoPrivacyTitle",
      "seoPrivacyDescription",
    ],
  },
];

export type TranslationPart = "hero" | "chrome" | "pages" | "google";

export type TranslationRow = {
  /** `copy.<key>` for site-wide texts, the section slot's path otherwise. */
  path: string;
  /** The field's name, for its label: a copy key or a section/item field. */
  field: string;
  /** 1-based position of the list row (a photo, a question) the text belongs to. */
  itemIndex?: number;
  source: string;
  target: string;
  /** Still the text pasted in from another language, not yet translated. */
  copied: boolean;
  /**
   * Still the site's default text while the source says something of the
   * operator's own: it no longer describes the same place (as the language
   * progress counts it).
   */
  stock: boolean;
};

export type TranslationGroup = {
  id: string;
  /** A part of the site, or a homepage section by its type and own title. */
  part?: TranslationPart;
  section?: { type: PublicSectionType; title: string };
  /** An own page's title and texts, by the page's title in the source language (or its address). */
  page?: { title: string };
  rows: TranslationRow[];
};

/** A row needs work when the source says something the target does not yet. */
export function rowMissing(row: TranslationRow): boolean {
  return row.source.trim().length > 0 && (row.target.trim().length === 0 || row.copied || row.stock);
}

/**
 * Every text with something to translate, grouped as the editor groups them:
 * the top of the page, each visible section in page order, then the texts
 * around the site. Rows empty in both languages are left out.
 */
export function translationGroups(
  draft: PublicSiteStudioDraft,
  from: PublicLocale,
  to: PublicLocale,
  stock?: PublicStockCopy,
): TranslationGroup[] {
  const copied = new Set(draft.copiedText[to] ?? []);
  const stockFrom = new Set(stock?.[from] ?? []);
  const stockTo = new Set(stock?.[to] ?? []);
  const row = (path: string, field: string, source: string, target: string, itemIndex?: number) => ({
    path,
    field,
    itemIndex,
    source,
    target,
    copied: target.trim().length > 0 && copied.has(target),
    stock: stockTo.has(target.trim()) && source.trim().length > 0 && !stockFrom.has(source.trim()),
  });
  const worthShowing = (r: TranslationRow) => r.source.trim() || r.target.trim();

  const flat = (id: TranslationPart, keys: FlatCopyKey[]): TranslationGroup => ({
    id,
    part: id,
    rows: keys
      .map((key) => row(`copy.${key}`, key, draft.copies[from][key] ?? "", draft.copies[to][key] ?? ""))
      .filter(worthShowing),
  });

  const sectionGroups = (list: SectionDraft[]): TranslationGroup[] => list
    .filter((section) => section.visible)
    .map((section) => {
      const kind = sectionKind(section.type);
      const sourceSlots = new Map(sectionTextSlots(section, from).map((slot) => [slot.path, slot.value]));
      const itemIndex = new Map(section.items.map((item, index) => [item.id, index + 1]));
      const rows = sectionTextSlots(section, to).map((slot) => {
        const rest = slot.path.slice(section.key.length + 1);
        const [first, itemId, field] = rest.split(".");
        return first === "items" && itemId && field
          ? row(slot.path, field, sourceSlots.get(slot.path) ?? "", slot.value, itemIndex.get(itemId))
          : row(slot.path, rest, sourceSlots.get(slot.path) ?? "", slot.value);
      });
      const ownTitle = kind.namedByTitle ? (section.copy[from].fields.title ?? "").trim() : "";
      return {
        id: section.key,
        section: { type: section.type, title: ownTitle },
        rows: rows.filter(worthShowing),
      };
    });

  // Each visible own page: its own texts, then its sections.
  const pages: TranslationGroup[] = draft.pages
    .filter((page) => page.visible)
    .flatMap((page) => {
      const source = new Map(pageTextSlots(page, from).map((slot) => [slot.path, slot.value]));
      const own: TranslationGroup = {
        id: `page.${page.key}`,
        page: { title: page.copy[from].title.trim() || `/${page.slug}` },
        rows: pageTextSlots(page, to)
          .map((slot) => row(slot.path, `page.${slot.path.split(".").pop()}`, source.get(slot.path) ?? "", slot.value))
          .filter(worthShowing),
      };
      return [own, ...sectionGroups(page.sections)];
    });

  const [hero, ...rest] = FLAT_GROUPS.map((group) => flat(group.id, group.keys));
  return [hero!, ...sectionGroups(draft.sections), ...pages, ...rest].filter((group) => group.rows.length > 0);
}

/** Write one row's translation into the draft, in language `to`. */
export function setTranslation(
  draft: PublicSiteStudioDraft,
  to: PublicLocale,
  path: string,
  value: string,
): PublicSiteStudioDraft {
  if (path.startsWith("copy.")) {
    const key = path.slice("copy.".length) as FlatCopyKey;
    return { ...draft, copies: { ...draft.copies, [to]: { ...draft.copies[to], [key]: value } } };
  }
  if (path.startsWith("page.")) {
    return { ...draft, pages: draft.pages.map((page) => setPageSlot(page, to, path, value)) };
  }
  return mapAllSections(draft, (section) =>
    path.startsWith(`${section.key}.`) ? setSectionSlot(section, to, path, value) : section,
  );
}

/** How many rows of each group still need translating. */
export function missingCount(groups: TranslationGroup[]): number {
  return groups.reduce((sum, group) => sum + group.rows.filter(rowMissing).length, 0);
}

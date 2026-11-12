import { readSectionStyle, styleFromSettings, styleToSettings, writeSectionStyle } from "@/features/public-site/domain/section-style";
import { pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import { PUBLIC_TEMPLATE_SECTION_ORDER } from "@/features/public-site/domain/order-sections";
import {
  PUBLIC_LOCALES,
  type LocalizedText,
  type PublicLocale,
  type PublicSectionType,
  type PublicSiteConfig,
  type PublicSiteSection,
  type PublicSiteSectionInput,
  type PublicTemplateId,
} from "@/features/public-site/domain/types";
import type { ItemStructure, StoredFields } from "@/features/public-site/sections/kind";
import { SECTION_KINDS, sectionKind } from "@/features/public-site/sections/kinds";

/** One row of a list section; its text lives per language in `SectionCopy.items`. */
export type SectionItemDraft = { id: string; structure: ItemStructure };

/** One language's text of a section: its own fields, and each row's by row id. */
export type SectionCopy = {
  fields: Record<string, string>;
  items: Record<string, Record<string, string>>;
};

/**
 * One homepage section in the editor. Rows and settings are shared by every
 * language, so removing a row in one language removes it everywhere.
 */
export type SectionDraft = {
  /** The saved id, or one made in the browser for a section added now. */
  key: string;
  type: PublicSectionType;
  visible: boolean;
  items: SectionItemDraft[];
  settings: Record<string, string>;
  copy: Record<PublicLocale, SectionCopy>;
};

/** One piece of section text, addressed the same way in every language. */
export type SectionTextSlot = { path: string; value: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let itemDraftSeq = 0;
/** Editor-only id of a row added now. */
export function nextItemDraftId(): string {
  itemDraftSeq += 1;
  return `item-draft-${itemDraftSeq}`;
}

function stored(value: unknown): StoredFields {
  return value && typeof value === "object" ? (value as StoredFields) : {};
}

function emptyCopy(): Record<PublicLocale, SectionCopy> {
  return Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, { fields: {}, items: {} }]),
  ) as Record<PublicLocale, SectionCopy>;
}

export function newSectionDraft(type: PublicSectionType, key: string): SectionDraft {
  const kind = sectionKind(type);
  return {
    key,
    type,
    visible: true,
    items: (kind.items?.starter?.() ?? []).map((structure) => ({ id: nextItemDraftId(), structure })),
    settings: kind.settings?.read({}) ?? {},
    copy: emptyCopy(),
  };
}

/** The first page's sections of a saved site, in page order, ready to edit. */
export function readSectionDrafts(config: PublicSiteConfig): SectionDraft[] {
  return readSectionList(config.sections, true);
}

/**
 * Saved sections of one page, in page order, ready to edit. The first page
 * also gets an empty section of each kind the editor must always be able to place.
 */
export function readSectionList(saved: PublicSiteSection[], withAlwaysPresent: boolean): SectionDraft[] {
  const drafts = [...saved]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((section): SectionDraft => {
      const kind = sectionKind(section.sectionType);
      const payload = stored(section.payload);
      const savedItems = Array.isArray(payload.items) ? (payload.items as StoredFields[]) : [];
      const items: SectionItemDraft[] = kind.items
        ? savedItems.map((saved, index) => ({
            id: kind.items!.savedId?.(saved) ?? `item-${index}`,
            structure: kind.items!.readStructure(saved),
          }))
        : [];
      const rows =
        kind.items && items.length === 0
          ? (kind.items.starter?.() ?? []).map((structure, index) => ({
              id: `item-${index}`,
              structure,
            }))
          : items;

      const copy = emptyCopy();
      for (const locale of PUBLIC_LOCALES) {
        for (const field of kind.copyFields) {
          copy[locale].fields[field] = pickOwnLocalized(payload[field] as LocalizedText, locale);
        }
        rows.forEach((row, index) => {
          const saved = savedItems[index] ?? {};
          copy[locale].items[row.id] = Object.fromEntries(
            (kind.items?.copyFields ?? []).map((field) => [
              field,
              pickOwnLocalized(saved[field] as LocalizedText, locale),
            ]),
          );
        });
      }

      return {
        key: section.id,
        type: section.sectionType,
        visible: section.visible,
        items: rows,
        settings: { ...(kind.settings?.read(payload) ?? {}), ...styleToSettings(readSectionStyle(payload.style)) },
        copy,
      };
    });

  // Kinds the editor must always be able to place (the gallery) get an empty one.
  for (const kind of withAlwaysPresent ? Object.values(SECTION_KINDS) : []) {
    if (kind.alwaysPresent && !drafts.some((draft) => draft.type === kind.type)) {
      drafts.push({
        ...newSectionDraft(kind.type, `new-${kind.type}`),
        visible: kind.alwaysPresent.visible,
      });
    }
  }
  return keepPinnedLast(drafts);
}

function localizedFrom(
  section: SectionDraft,
  read: (copy: SectionCopy) => string | undefined,
  previous: unknown,
): LocalizedText {
  const values = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, read(section.copy[locale]) ?? ""]),
  ) as Record<PublicLocale, string>;
  return writeLocalizedMap(previous as LocalizedText | undefined, values);
}

/** The first page's sections to save, in page order. Fields this editor does not know are kept. */
export function writeSectionDrafts(
  config: PublicSiteConfig,
  sections: SectionDraft[],
): PublicSiteSectionInput[] {
  return writeSectionList(config.sections, sections);
}

/** One page's sections to save, against what that page had saved. */
export function writeSectionList(
  savedSections: PublicSiteSection[],
  sections: SectionDraft[],
): PublicSiteSectionInput[] {
  return sections.map((section, index) => {
    const kind = sectionKind(section.type);
    const saved = savedSections.find((row) => row.id === section.key);
    const previous = stored(saved?.payload);
    const payload: StoredFields = { ...previous };

    for (const field of kind.copyFields) {
      payload[field] = localizedFrom(section, (copy) => copy.fields[field], previous[field]);
    }

    let hasItems = false;
    if (kind.items) {
      const itemKind = kind.items;
      const savedItems = Array.isArray(previous.items) ? (previous.items as StoredFields[]) : [];
      payload.items = section.items.flatMap((item) => {
        const hasCopy = PUBLIC_LOCALES.some((locale) =>
          itemKind.copyFields.some((field) => section.copy[locale].items[item.id]?.[field]?.trim()),
        );
        if (!itemKind.keep(item.structure, hasCopy)) return [];
        const before = savedItems.find((row) => itemKind.savedId?.(row) === item.id);
        const text = Object.fromEntries(
          itemKind.copyFields.map((field) => [
            field,
            localizedFrom(section, (copy) => copy.items[item.id]?.[field], before?.[field]),
          ]),
        );
        return [{ ...itemKind.writeStructure(item.id, item.structure), ...text }];
      });
      hasItems = (payload.items as unknown[]).length > 0;
    }

    if (kind.settings) Object.assign(payload, kind.settings.write(section.settings));
    const style = writeSectionStyle(styleFromSettings(section.settings));
    // Back to "as the page" everywhere: the stored style goes too.
    if (style) payload.style = style;
    else delete payload.style;

    return {
      ...(UUID_PATTERN.test(section.key) ? { id: section.key } : {}),
      sectionType: section.type,
      sortOrder: index * 10,
      visible: section.visible && (!kind.shownOnlyWithItems || hasItems),
      payload,
    } as PublicSiteSectionInput;
  });
}

/** Every text slot of a section in one language, rows included. */
export function sectionTextSlots(section: SectionDraft, locale: PublicLocale): SectionTextSlot[] {
  const kind = sectionKind(section.type);
  const copy = section.copy[locale];
  return [
    ...kind.copyFields.map((field) => ({
      path: `${section.key}.${field}`,
      value: copy.fields[field] ?? "",
    })),
    ...section.items.flatMap((item) =>
      (kind.items?.copyFields ?? []).map((field) => ({
        path: `${section.key}.items.${item.id}.${field}`,
        value: copy.items[item.id]?.[field] ?? "",
      })),
    ),
  ];
}

/** The slots a language must fill for this section to count as translated. */
export function sectionProgressSlots(section: SectionDraft, locale: PublicLocale): SectionTextSlot[] {
  const kind = sectionKind(section.type);
  const copy = section.copy[locale];
  return [
    ...kind.progressFields.map((field) => ({
      path: `${section.key}.${field}`,
      value: copy.fields[field] ?? "",
    })),
    ...section.items.flatMap((item) =>
      (kind.items?.progressFields ?? []).map((field) => ({
        path: `${section.key}.items.${item.id}.${field}`,
        value: copy.items[item.id]?.[field] ?? "",
      })),
    ),
  ];
}

/** Write one text slot (from `sectionTextSlots`) in one language. */
export function setSectionSlot(
  section: SectionDraft,
  locale: PublicLocale,
  path: string,
  value: string,
): SectionDraft {
  const rest = path.slice(section.key.length + 1);
  const copy = section.copy[locale];
  let next: SectionCopy;
  if (rest.startsWith("items.")) {
    const [, itemId = "", field = ""] = rest.split(".");
    next = { ...copy, items: { ...copy.items, [itemId]: { ...copy.items[itemId], [field]: value } } };
  } else {
    next = { ...copy, fields: { ...copy.fields, [rest]: value } };
  }
  return { ...section, copy: { ...section.copy, [locale]: next } };
}

/** The first section of a type in the draft. */
export function findSectionDraft(
  sections: SectionDraft[],
  type: PublicSectionType,
): SectionDraft | undefined {
  return sections.find((section) => section.type === type);
}

export function sectionField(section: SectionDraft | undefined, locale: PublicLocale, field: string): string {
  return section?.copy[locale].fields[field] ?? "";
}

export function setSectionField(
  section: SectionDraft,
  locale: PublicLocale,
  field: string,
  value: string,
): SectionDraft {
  const copy = section.copy[locale];
  return {
    ...section,
    copy: { ...section.copy, [locale]: { ...copy, fields: { ...copy.fields, [field]: value } } },
  };
}

export function itemField(
  section: SectionDraft,
  locale: PublicLocale,
  itemId: string,
  field: string,
): string {
  return section.copy[locale].items[itemId]?.[field] ?? "";
}

export function setItemField(
  section: SectionDraft,
  locale: PublicLocale,
  itemId: string,
  field: string,
  value: string,
): SectionDraft {
  return setSectionSlot(section, locale, `${section.key}.items.${itemId}.${field}`, value);
}

export function setItemStructure(
  section: SectionDraft,
  itemId: string,
  patch: ItemStructure,
): SectionDraft {
  return {
    ...section,
    items: section.items.map((item) =>
      item.id === itemId ? { ...item, structure: { ...item.structure, ...patch } } : item,
    ),
  };
}

/** Append a row (up to the kind's limit), with `structure` over the kind's defaults. */
export function addSectionItem(
  section: SectionDraft,
  structure: ItemStructure = {},
  id: string = nextItemDraftId(),
): SectionDraft {
  const itemKind = sectionKind(section.type).items;
  if (!itemKind || section.items.length >= itemKind.max) return section;
  return {
    ...section,
    items: [...section.items, { id, structure: { ...itemKind.newItem(), ...structure } }],
  };
}

export function removeSectionItem(section: SectionDraft, itemId: string): SectionDraft {
  return { ...section, items: section.items.filter((item) => item.id !== itemId) };
}

export function moveSectionItem(section: SectionDraft, itemId: string, direction: -1 | 1): SectionDraft {
  const items = [...section.items];
  const index = items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= items.length) return section;
  [items[index], items[target]] = [items[target]!, items[index]!];
  return { ...section, items };
}

/** Drag and drop: put a row where another one is. */
export function moveSectionItemTo(section: SectionDraft, itemId: string, targetId: string): SectionDraft {
  const items = [...section.items];
  const from = items.findIndex((item) => item.id === itemId);
  const to = items.findIndex((item) => item.id === targetId);
  if (from === -1 || to === -1 || from === to) return section;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved!);
  return { ...section, items };
}

/** Pinned kinds (the closing band) stay after every other section. */
export function keepPinnedLast(sections: SectionDraft[]): SectionDraft[] {
  const pinned = (section: SectionDraft) => Boolean(sectionKind(section.type).pinnedLast);
  return [...sections.filter((section) => !pinned(section)), ...sections.filter(pinned)];
}

/** Sections the operator can reorder, in their current order. */
export function movableSections(sections: SectionDraft[]): SectionDraft[] {
  return sections.filter((section) => !sectionKind(section.type).pinnedLast);
}

/** Swap a section with its movable neighbour; pinned sections stay at the end. */
export function moveSectionDraft(
  sections: SectionDraft[],
  key: string,
  direction: -1 | 1,
): SectionDraft[] {
  const movable = movableSections(sections);
  const index = movable.findIndex((section) => section.key === key);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= movable.length) return sections;
  [movable[index], movable[target]] = [movable[target]!, movable[index]!];
  return [...movable, ...sections.filter((section) => sectionKind(section.type).pinnedLast)];
}

/** How many of a kind a page may hold: on the first page only kinds the operator adds; on an own page, any kind. */
export function sectionKindLimit(type: PublicSectionType, ownPage: boolean): number {
  const addable = sectionKind(type).addable?.max;
  return ownPage ? (addable ?? 1) : (addable ?? 0);
}

/** Add a section of a kind; null when the page holds as many as it may. */
export function addSectionDraft(
  sections: SectionDraft[],
  type: PublicSectionType,
  key: string,
  ownPage = false,
): SectionDraft[] | null {
  const limit = sectionKindLimit(type, ownPage);
  if (sections.filter((section) => section.type === type).length >= limit) return null;
  return keepPinnedLast([...sections, newSectionDraft(type, key)]);
}

export function removeSectionDraft(sections: SectionDraft[], key: string): SectionDraft[] {
  return sections.filter((section) => section.key !== key);
}

/** A layout's default rhythm; sections of the same kind keep their order. */
export function orderSectionsForTemplate(
  sections: SectionDraft[],
  templateId: PublicTemplateId,
): SectionDraft[] {
  const rank = new Map(PUBLIC_TEMPLATE_SECTION_ORDER[templateId].map((type, index) => [type, index]));
  const sorted = sections
    .map((section, index) => ({ section, index }))
    .sort(
      (a, b) =>
        (rank.get(a.section.type) ?? 99) - (rank.get(b.section.type) ?? 99) || a.index - b.index,
    )
    .map(({ section }) => section);
  return keepPinnedLast(sorted);
}

/** Editor key of the n-th rendered section of a type (preview clicks). */
export function sectionKeyForRendered(
  sections: SectionDraft[],
  type: string,
  nth: number,
): string | null {
  return sections.filter((section) => section.type === type)[nth]?.key ?? null;
}

/** Drag and drop: put a section where another one is; pinned sections stay at the end. */
export function moveSectionDraftTo(
  sections: SectionDraft[],
  key: string,
  targetKey: string,
): SectionDraft[] {
  const movable = movableSections(sections);
  const from = movable.findIndex((section) => section.key === key);
  const to = movable.findIndex((section) => section.key === targetKey);
  if (from === -1 || to === -1 || from === to) return sections;
  const [moved] = movable.splice(from, 1);
  movable.splice(to, 0, moved!);
  return [...movable, ...sections.filter((section) => sectionKind(section.type).pinnedLast)];
}

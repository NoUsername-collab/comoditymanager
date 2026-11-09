import type { PublicDefaultCopy } from "@/features/public-site/domain/defaults";
import type { PublicSectionType } from "@/features/public-site/domain/types";

/** A saved payload or item, read field by field without knowing its type. */
export type StoredFields = Record<string, unknown>;

/** Language-independent data of one list item (a benefit's icon, a photo's url). */
export type ItemStructure = Record<string, string>;

/**
 * The repeated rows inside a section: highlights, steps, photos. One description
 * drives reading, editing, translating, measuring and saving them.
 */
export type SectionItemKind = {
  /** Text fields of one item, written per language. */
  copyFields: readonly string[];
  /** Of those, the ones a language must fill to count as translated. */
  progressFields: readonly string[];
  max: number;
  /** Structure kept from a saved item (icon, url…). */
  readStructure: (saved: StoredFields) => ItemStructure;
  /** Saved id of an item, when the payload keeps one (photos); otherwise rows go by position. */
  savedId?: (saved: StoredFields) => string | undefined;
  /** Structure of a row the operator adds. */
  newItem: () => ItemStructure;
  /** Rows a section with none starts with. */
  starter?: () => ItemStructure[];
  /** Whether a row is worth saving: some text in a language, or a photo. */
  keep: (structure: ItemStructure, hasCopy: boolean) => boolean;
  /** Language-independent part of the saved item. */
  writeStructure: (id: string, structure: ItemStructure) => StoredFields;
};

/**
 * Everything the editor and the save need to know about one kind of homepage
 * section. Adding a kind means a folder in `sections/` with this description, its
 * editor and its renderer, plus its payload type and save schema in the domain.
 */
export type SectionKind = {
  type: PublicSectionType;
  /** Text fields of the section itself, written per language. */
  copyFields: readonly string[];
  /** Of those, the ones a language must fill to count as translated. */
  progressFields: readonly string[];
  /** Field shown on the collapsed editor card. */
  summaryField?: string;
  items?: SectionItemKind;
  /** Language-independent settings (a button's link). */
  settings?: {
    read: (payload: StoredFields) => Record<string, string>;
    write: (settings: Record<string, string>) => StoredFields;
  };
  /** The operator adds it from "Add a section" and may remove it; at most `max` on a page. */
  addable?: { max: number };
  /** Several exist side by side, so each is named by its own title (free texts). */
  namedByTitle?: boolean;
  /** Always the last section, on the page and in the editor. */
  pinnedLast?: boolean;
  /** The editor always has one to place, even before anything is saved; `visible` is how it starts. */
  alwaysPresent?: { visible: boolean };
  /** How a new site starts with this kind; kinds without it are added by the operator. */
  seed?: (copy: PublicDefaultCopy) => { visible: boolean; payload: StoredFields };
  /** Shown on the page only with something in it (a gallery needs a photo). */
  shownOnlyWithItems?: boolean;
};

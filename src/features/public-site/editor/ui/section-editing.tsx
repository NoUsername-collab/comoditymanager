"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  addSectionItem,
  itemField,
  moveSectionItem,
  removeSectionDraft,
  removeSectionItem,
  sectionField,
  setItemField,
  setItemStructure,
  setSectionField,
  type SectionDraft,
  type SectionItemDraft,
} from "@/features/public-site/editor/model/section-draft";
import { patchStudioSection } from "@/features/public-site/editor/model/studio-draft";
import type { ItemStructure } from "@/features/public-site/sections/kind";
import { sectionKind } from "@/features/public-site/sections/kinds";

/** Props every section editor gets from the content panel. */
export type SectionEditorProps = { section: SectionDraft };

/**
 * Reading and writing one section in the language being edited. Section editors
 * use this instead of touching the draft, so they stay a list of fields.
 */
export function useSectionEditing(section: SectionDraft) {
  const { draft, setDraft, readOnly } = usePublicSiteEditor();
  const locale = draft.editLocale;
  const update = (change: (current: SectionDraft) => SectionDraft) =>
    setDraft((d) => patchStudioSection(d, section.key, change));

  return {
    readOnly,
    field: (name: string) => sectionField(section, locale, name),
    setField: (name: string) => (value: string) =>
      setDraft((d) =>
        patchStudioSection(d, section.key, (current) => setSectionField(current, d.editLocale, name, value)),
      ),
    itemField: (itemId: string, name: string) => itemField(section, locale, itemId, name),
    setItemField: (itemId: string, name: string) => (value: string) =>
      setDraft((d) =>
        patchStudioSection(d, section.key, (current) =>
          setItemField(current, d.editLocale, itemId, name, value),
        ),
      ),
    setItemStructure: (itemId: string, patch: ItemStructure) =>
      update((current) => setItemStructure(current, itemId, patch)),
    setting: (name: string) => section.settings[name] ?? "",
    setSetting: (name: string) => (value: string) =>
      update((current) => ({ ...current, settings: { ...current.settings, [name]: value } })),
    addItem: (structure?: ItemStructure) => update((current) => addSectionItem(current, structure)),
    removeItem: (itemId: string) => update((current) => removeSectionItem(current, itemId)),
    moveItem: (itemId: string, direction: -1 | 1) =>
      update((current) => moveSectionItem(current, itemId, direction)),
    removeSection: () => setDraft((d) => ({ ...d, sections: removeSectionDraft(d.sections, section.key) })),
  };
}

export type SectionEditing = ReturnType<typeof useSectionEditing>;

/**
 * The rows of a list section (highlights, steps, photos): heading, remove and
 * optional move buttons around each row's own fields, and an add button.
 */
export function SectionItemList({
  section,
  editing,
  itemLabel,
  addLabel,
  removeLabel,
  movable = false,
  empty,
  renderItem,
}: {
  section: SectionDraft;
  editing: SectionEditing;
  itemLabel?: (index: number) => string;
  addLabel: string;
  removeLabel?: string;
  movable?: boolean;
  empty?: ReactNode;
  renderItem: (item: SectionItemDraft, index: number) => ReactNode;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const max = sectionKind(section.type).items?.max ?? 0;

  return (
    <>
      {section.items.length === 0 && empty ? (
        empty
      ) : (
        <ol className="pub-editor-items">
          {section.items.map((item, index) => (
            <li key={item.id} className="pub-editor-item">
              <div className="pub-editor-item__head">
                {itemLabel ? <strong>{itemLabel(index)}</strong> : null}
                {movable ? (
                  <span className="pub-gallery-editor__actions">
                    <button
                      type="button"
                      className="pub-gallery-editor__icon-btn"
                      aria-label={t("galleryMoveUp")}
                      disabled={index === 0}
                      onClick={() => editing.moveItem(item.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="pub-gallery-editor__icon-btn"
                      aria-label={t("galleryMoveDown")}
                      disabled={index === section.items.length - 1}
                      onClick={() => editing.moveItem(item.id, 1)}
                    >
                      ↓
                    </button>
                  </span>
                ) : null}
                <button
                  type="button"
                  className="pub-editor-item__remove"
                  onClick={() => editing.removeItem(item.id)}
                >
                  {removeLabel ?? te("remove")}
                </button>
              </div>
              {renderItem(item, index)}
            </li>
          ))}
        </ol>
      )}
      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => editing.addItem()}
        disabled={section.items.length >= max}
      >
        {addLabel}
      </AdminButton>
    </>
  );
}

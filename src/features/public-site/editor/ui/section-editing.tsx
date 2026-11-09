"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  addSectionItem,
  itemField,
  moveSectionItem,
  moveSectionItemTo,
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
import { useOutlineDrag } from "@/features/public-site/editor/ui/PublicSiteOutline";

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
    moveItemTo: (itemId: string, targetId: string) =>
      update((current) => moveSectionItemTo(current, itemId, targetId)),
    setVisible: (visible: boolean) => update((current) => ({ ...current, visible })),
    removeSection: () => setDraft((d) => ({ ...d, sections: removeSectionDraft(d.sections, section.key) })),
  };
}

export type SectionEditing = ReturnType<typeof useSectionEditing>;

/**
 * The rows of a list section (highlights, steps, photos): a drag handle (mouse,
 * finger or arrow keys), the row's heading and remove button around its own
 * fields, and an add button, or the section's own way to add rows.
 */
export function SectionItemList({
  section,
  editing,
  itemLabel,
  addLabel,
  removeLabel,
  empty,
  addControl,
  renderItem,
}: {
  section: SectionDraft;
  editing: SectionEditing;
  itemLabel?: (index: number) => string;
  addLabel: string;
  removeLabel?: string;
  empty?: ReactNode;
  /** Replaces the plain add button (the gallery adds several photos at once). */
  addControl?: ReactNode;
  renderItem: (item: SectionItemDraft, index: number) => ReactNode;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const max = sectionKind(section.type).items?.max ?? 0;
  const drag = useOutlineDrag(editing.moveItemTo, editing.moveItem);

  return (
    <>
      {section.items.length === 0 && empty ? (
        empty
      ) : (
        <ol className="pub-editor-items">
          {section.items.map((item, index) => {
            const label = itemLabel?.(index) ?? te("itemNumber", { index: index + 1 });
            return (
              <li
                key={item.id}
                className="pub-editor-item"
                data-edit-key={item.id}
                data-drag-target="1"
                data-dragging={drag.dragging === item.id ? "1" : undefined}
                data-over={drag.dragging && drag.over === item.id ? "1" : undefined}
              >
                <div className="pub-editor-item__head">
                  {section.items.length > 1 ? (
                    <button
                      type="button"
                      className="pub-outline__handle"
                      aria-label={te("dragHandle", { name: label })}
                      title={te("dragHandle", { name: label })}
                      {...drag.handleProps(item.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                        event.preventDefault();
                        editing.moveItem(item.id, event.key === "ArrowUp" ? -1 : 1);
                      }}
                    >
                      <span aria-hidden>⋮⋮</span>
                    </button>
                  ) : null}
                  {itemLabel ? <strong>{label}</strong> : <span />}
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
            );
          })}
        </ol>
      )}
      {addControl ?? (
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => editing.addItem()}
          disabled={section.items.length >= max}
        >
          {addLabel}
        </AdminButton>
      )}
    </>
  );
}

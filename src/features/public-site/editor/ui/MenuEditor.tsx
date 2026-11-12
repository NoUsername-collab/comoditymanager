"use client";

import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { PublicMenuItem } from "@/features/public-site/domain/types";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  addMenuItem,
  canAddMenuItem,
  canIndentMenuItem,
  indentMenuItem,
  menuItemComplete,
  menuTargetValue,
  moveMenuItem,
  outdentMenuItem,
  removeMenuItem,
  setMenuLabel,
  patchMenuItem,
  withMenuTarget,
} from "@/features/public-site/editor/model/menu-draft";
import { sectionField, type SectionDraft } from "@/features/public-site/editor/model/section-draft";
import { sectionKind } from "@/features/public-site/sections/kinds";

type TargetOption = { value: string; label: string; hidden?: boolean };

/**
 * The header menu: links in order, each to a page, a section, a built-in page
 * or elsewhere, with one level of submenu. A label left empty takes the name
 * of what the link goes to, in each language.
 */
export function MenuEditor() {
  const te = useTranslations("admin.pages.publicSite.editor.menu");
  const tc = useTranslations("admin.pages.publicSite.editor");
  const { draft, copy, setDraft, readOnly } = usePublicSiteEditor();
  const locale = draft.editLocale;
  const menu = draft.menu;
  const setMenu = (update: (menu: PublicMenuItem[]) => PublicMenuItem[]) =>
    setDraft((d) => ({ ...d, menu: update(d.menu) }));

  const sectionName = (section: SectionDraft) => {
    const title = kindTitle(section);
    return title || tc(`cards.${section.type}.name`);
  };
  function kindTitle(section: SectionDraft): string {
    return sectionKind(section.type).copyFields.includes("title")
      ? sectionField(section, locale, "title").trim()
      : "";
  }
  const pageName = (key: string) => {
    const page = draft.pages.find((row) => row.key === key);
    return page ? page.copy[locale].title.trim() || `/${page.slug}` : "";
  };

  // Every place a link can go, grouped as the picker lists them.
  const pageOptions: TargetOption[] = [
    { value: "home", label: te("targets.home") },
    ...draft.pages.map((page) => ({ value: `page:${page.key}`, label: pageName(page.key), hidden: !page.visible })),
  ];
  const sectionOptions: TargetOption[] = [
    ...draft.sections.map((section) => ({
      value: `section:${section.key}`,
      label: `${te("targets.home")} › ${sectionName(section)}`,
      hidden: !section.visible,
    })),
    ...draft.pages.flatMap((page) =>
      page.sections.map((section) => ({
        value: `section:${section.key}`,
        label: `${pageName(page.key)} › ${sectionName(section)}`,
        hidden: !section.visible || !page.visible,
      })),
    ),
  ];
  const builtInOptions: TargetOption[] = [
    { value: "calendar", label: te("targets.calendar") },
    { value: "privacy", label: te("targets.privacy") },
    { value: "terms", label: te("targets.terms") },
  ];

  /** The name a link takes when its label is left empty. */
  function defaultName(item: PublicMenuItem): string {
    switch (item.kind) {
      case "home":
        return copy.navHome;
      case "privacy":
        return copy.navPrivacy;
      case "terms":
        return copy.navTerms;
      case "calendar":
        return copy.navBook;
      case "page":
        return pageName(item.ref ?? "");
      case "section": {
        const section = [...draft.sections, ...draft.pages.flatMap((page) => page.sections)].find(
          (row) => row.key === item.ref,
        );
        return section ? kindTitle(section) : "";
      }
      default:
        return "";
    }
  }

  const newItem = (): PublicMenuItem => ({ id: crypto.randomUUID(), kind: "page", ref: "", label: {} });

  function renderItem(item: PublicMenuItem, index: number, list: PublicMenuItem[], parentId: string | null) {
    const value = menuTargetValue(item);
    const fallback = defaultName(item);
    const ownLabel = item.label[locale] ?? "";
    const needsLabel = (item.kind === "url" || item.kind === "group") && !ownLabel.trim();
    const target = [...pageOptions, ...sectionOptions].find((option) => option.value === value);
    const missing = (item.kind === "page" || item.kind === "section") && item.ref && !target;
    const option = (o: TargetOption) => (
      <option key={o.value} value={o.value}>
        {o.label}
        {o.hidden ? ` (${te("hiddenTarget")})` : ""}
      </option>
    );
    return (
      <li key={item.id} className="pub-menu-editor__item" data-sub={parentId ? "1" : undefined}>
        <div className="pub-menu-editor__head">
          <span className="pub-menu-editor__name">{ownLabel.trim() || fallback || te("unnamed")}</span>
          <div className="pub-menu-editor__tools">
            <button
              type="button"
              aria-label={te("moveUp")}
              title={te("moveUp")}
              disabled={readOnly || index === 0}
              onClick={() => setMenu((m) => moveMenuItem(m, item.id, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={te("moveDown")}
              title={te("moveDown")}
              disabled={readOnly || index === list.length - 1}
              onClick={() => setMenu((m) => moveMenuItem(m, item.id, 1))}
            >
              ↓
            </button>
            {parentId ? (
              <button
                type="button"
                title={te("outdent")}
                aria-label={te("outdent")}
                disabled={readOnly}
                onClick={() => setMenu((m) => outdentMenuItem(m, item.id))}
              >
                ⇤
              </button>
            ) : (
              <button
                type="button"
                title={te("indent")}
                aria-label={te("indent")}
                disabled={readOnly || !canIndentMenuItem(menu, item.id)}
                onClick={() => setMenu((m) => indentMenuItem(m, item.id))}
              >
                ⇥
              </button>
            )}
            <button
              type="button"
              className="pub-menu-editor__remove"
              aria-label={te("remove")}
              title={te("remove")}
              disabled={readOnly}
              onClick={() => setMenu((m) => removeMenuItem(m, item.id))}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="pub-menu-editor__fields">
          <label>
            <span>{te("target")}</span>
            <select
              value={missing ? "" : value === "page:" || value === "section:" ? "" : value}
              disabled={readOnly}
              onChange={(event) => setMenu((m) => patchMenuItem(m, item.id, (row) => withMenuTarget(row, event.target.value)))}
            >
              <option value="" disabled>
                {missing ? te("targetGone") : te("pick")}
              </option>
              <optgroup label={te("groups.pages")}>{pageOptions.map(option)}</optgroup>
              {sectionOptions.length > 0 ? (
                <optgroup label={te("groups.sections")}>{sectionOptions.map(option)}</optgroup>
              ) : null}
              <optgroup label={te("groups.builtIn")}>{builtInOptions.map(option)}</optgroup>
              <optgroup label={te("groups.other")}>
                <option value="url">{te("targets.url")}</option>
                {parentId ? null : <option value="group">{te("targets.group")}</option>}
              </optgroup>
            </select>
          </label>
          {item.kind === "url" ? (
            <label>
              <span>{te("address")}</span>
              <input
                type="text"
                inputMode="url"
                value={item.ref ?? ""}
                placeholder="https://"
                disabled={readOnly}
                onChange={(event) =>
                  setMenu((m) => patchMenuItem(m, item.id, (row) => ({ ...row, ref: event.target.value })))
                }
              />
            </label>
          ) : null}
          <label>
            <span>{te("label")}</span>
            <input
              type="text"
              value={ownLabel}
              placeholder={fallback || (item.kind === "group" ? te("groupPlaceholder") : "")}
              disabled={readOnly}
              aria-invalid={needsLabel || undefined}
              onChange={(event) => setMenu((m) => setMenuLabel(m, item.id, locale, event.target.value))}
            />
          </label>
        </div>
        {!menuItemComplete(item) || needsLabel || missing ? (
          <p className="pub-menu-editor__warn" role="status">
            {missing ? te("targetGoneHint") : needsLabel ? te("needsLabel") : te("incomplete")}
          </p>
        ) : null}
        {parentId === null && item.children?.length ? (
          <ol className="pub-menu-editor__list pub-menu-editor__list--sub">
            {item.children.map((child, childIndex) => renderItem(child, childIndex, item.children!, item.id))}
          </ol>
        ) : null}
        {parentId === null && (item.kind === "group" || item.children?.length) ? (
          <button
            type="button"
            className="pub-menu-editor__add-sub"
            disabled={readOnly || !canAddMenuItem(menu, item.id)}
            onClick={() => setMenu((m) => addMenuItem(m, newItem(), item.id))}
          >
            + {te("addSub")}
          </button>
        ) : null}
      </li>
    );
  }

  return (
    <div className="pub-menu-editor">
      <p className="pub-menu-editor__hint">{te("hint")}</p>
      {menu.length === 0 ? <p className="pub-menu-editor__empty">{te("empty")}</p> : null}
      <ol className="pub-menu-editor__list">{menu.map((item, index) => renderItem(item, index, menu, null))}</ol>
      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={readOnly || !canAddMenuItem(menu, null)}
        onClick={() => setMenu((m) => addMenuItem(m, newItem()))}
      >
        + {te("add")}
      </AdminButton>
      <p className="pub-menu-editor__hint">{te("bookHint")}</p>
    </div>
  );
}

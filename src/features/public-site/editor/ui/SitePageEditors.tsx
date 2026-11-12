"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { MAX_SITE_PAGES, pageSlugProblem, slugifyPageName } from "@/features/public-site/domain/site-pages";
import { addMenuItem } from "@/features/public-site/editor/model/menu-draft";
import {
  createSitePageDraft,
  PAGE_MODEL_IDS,
  PAGE_MODELS,
  setPageText,
  type PageModelId,
  type PageTextField,
  type SitePageDraft,
} from "@/features/public-site/editor/model/site-page-draft";
import { patchStudioPage } from "@/features/public-site/editor/model/studio-draft";
import {
  EditorField,
  EditorToggle,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";

/** The pages of the site, as tabs over the outline: the first page, each own page, and "new page". */
export function PageSwitcher({ onNewPage }: { onNewPage: () => void }) {
  const te = useTranslations("admin.pages.publicSite.editor.sitePages");
  const { draft, activePage, setActivePage, readOnly } = usePublicSiteEditor();
  const locale = draft.editLocale;
  return (
    <nav className="pub-page-switch" aria-label={te("switchAria")}>
      <button
        type="button"
        className="pub-page-switch__page"
        aria-current={activePage === null ? "page" : undefined}
        onClick={() => setActivePage(null)}
      >
        {te("home")}
      </button>
      {draft.pages.map((page) => (
        <button
          key={page.key}
          type="button"
          className="pub-page-switch__page"
          aria-current={activePage === page.key ? "page" : undefined}
          data-hidden={page.visible ? undefined : "1"}
          onClick={() => setActivePage(page.key)}
        >
          {page.copy[locale].title.trim() || `/${page.slug}`}
        </button>
      ))}
      {draft.pages.length < MAX_SITE_PAGES ? (
        <button type="button" className="pub-page-switch__new" disabled={readOnly} onClick={onNewPage}>
          + {te("new")}
        </button>
      ) : null}
    </nav>
  );
}

/** A new page: its name and the model it starts from. It is added to the menu and opened. */
export function NewPageForm({ onDone }: { onDone: () => void }) {
  const te = useTranslations("admin.pages.publicSite.editor.sitePages");
  const tc = useTranslations("admin.pages.publicSite.editor");
  const { draft, setDraft, setActivePage } = usePublicSiteEditor();
  const [name, setName] = useState("");
  const [model, setModel] = useState<PageModelId>("blank");

  function create() {
    const title = name.trim() || te(`models.${model}.name`);
    const page = createSitePageDraft({
      name: title,
      model,
      locale: draft.editLocale,
      takenSlugs: draft.pages.map((row) => row.slug),
      newKey: () => crypto.randomUUID(),
    });
    setDraft((d) => ({
      ...d,
      pages: [...d.pages, page],
      menu: addMenuItem(d.menu, { id: crypto.randomUUID(), kind: "page", ref: page.key, label: {} }),
    }));
    setActivePage(page.key);
    onDone();
  }

  return (
    <div className="pub-new-page">
      <h3 className="pub-new-page__title">{te("newTitle")}</h3>
      <div className="admin-settings-fields">
        <EditorField label={te("name")} value={name} onChange={setName} placeholder={te("namePlaceholder")} />
      </div>
      <fieldset className="pub-new-page__models">
        <legend>{te("model")}</legend>
        <div className="pub-editor-choices" role="radiogroup" aria-label={te("model")}>
          {PAGE_MODEL_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={model === id}
              className="pub-editor-choice"
              onClick={() => setModel(id)}
            >
              <span className="pub-editor-choice__title">{te(`models.${id}.name`)}</span>
              <span className="pub-editor-choice__desc">
                {PAGE_MODELS[id].map((entry) => tc(`cards.${entry.type}.name`)).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      <p className="pub-new-page__hint">{te("newHint")}</p>
      <div className="pub-new-page__actions">
        <AdminButton type="button" size="sm" onClick={create}>
          {te("create")}
        </AdminButton>
        <AdminButton type="button" size="sm" variant="secondary" onClick={onDone}>
          {tc("cancel")}
        </AdminButton>
      </div>
    </div>
  );
}

/** One own page: its address, title, line, photo, search text and whether it is shown. */
export function PageSettingsEditor({ page }: { page: SitePageDraft }) {
  const te = useTranslations("admin.pages.publicSite.editor.sitePages");
  const { draft, setDraft, readOnly, fieldError } = usePublicSiteEditor();
  const locale = draft.editLocale;
  const update = (change: (page: SitePageDraft) => SitePageDraft) =>
    setDraft((d) => patchStudioPage(d, page.key, change));
  const setText = (field: PageTextField) => (value: string) =>
    update((current) => setPageText(current, locale, field, value));

  const index = draft.pages.findIndex((row) => row.key === page.key);
  const problem = pageSlugProblem(
    page.slug,
    draft.pages.filter((row) => row.key !== page.key).map((row) => row.slug),
  );
  const serverError = fieldError(`sitePages.${index}.slug`);

  return (
    <div className="admin-settings-fields">
      <EditorField label={te("title")} value={page.copy[locale].title} onChange={setText("title")} />
      <EditorField label={te("lead")} rows={2} value={page.copy[locale].lead} onChange={setText("lead")} />
      <label className="pub-page-slug">
        <span>{te("address")}</span>
        <span className="pub-page-slug__field">
          <span aria-hidden>/</span>
          <input
            type="text"
            value={page.slug}
            disabled={readOnly}
            aria-invalid={problem ? true : undefined}
            onChange={(event) => update((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
            onBlur={() => update((current) => ({ ...current, slug: slugifyPageName(current.slug) }))}
          />
        </span>
        {problem || serverError ? (
          <small className="pub-page-slug__error" role="alert">
            {te(`slugProblem.${problem ?? "taken"}`)}
          </small>
        ) : (
          <small>{te("addressHint")}</small>
        )}
      </label>
      <PublicSiteImageField
        kind="section"
        label={te("photo")}
        hint={te("photoHint")}
        value={page.imageUrl}
        onChange={(url) => update((current) => ({ ...current, imageUrl: url }))}
        disabled={readOnly}
      />
      <EditorField
        label={te("seoDescription")}
        rows={2}
        value={page.copy[locale].seoDescription}
        onChange={setText("seoDescription")}
        hint={te("seoDescriptionHint")}
      />
      <EditorToggle
        label={te("visible")}
        hint={te("visibleHint")}
        checked={page.visible}
        onChange={(visible) => update((current) => ({ ...current, visible }))}
      />
    </div>
  );
}

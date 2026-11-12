"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { slugifyPageName } from "@/features/public-site/domain/site-pages";
import { resolvePublicThemeStyle } from "@/features/public-site/themes/loader";
import {
  matchingSiteTemplate,
  PAGE_MODEL_NAMES,
  SITE_TEMPLATES,
  siteTemplate,
} from "@/features/public-site/editor/model/site-templates";
import { EditorGroup, usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";

/**
 * Ready-made sites: a click shows one in the preview; "Apply" takes it, and
 * the operator's texts and photos stay. Undo brings the site back as it was.
 */
export function SiteTemplatesGroup() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor.siteTemplates");
  const tc = useTranslations("admin.pages.publicSite.editor");
  const { draft, readOnly, templatePreview, setTemplatePreview, applyTemplate } = usePublicSiteEditor();
  const current = matchingSiteTemplate(draft);
  const previewed = templatePreview ? siteTemplate(templatePreview) : undefined;
  // What applying adds: own pages the site does not have yet.
  const newPages = (previewed?.pages ?? []).filter(
    (model) => !draft.pages.some((page) => page.slug === slugifyPageName(PAGE_MODEL_NAMES[model].ro)),
  );

  return (
    <EditorGroup title={te("title")} description={te("desc")}>
      {previewed ? (
        <div className="pub-templates__preview" role="status">
          <p>
            <strong>{te("previewing", { name: te(`items.${previewed.id}.name`) })}</strong>{" "}
            {te("keeps")}
            {newPages.length > 0
              ? ` ${te("adds", { pages: newPages.map((model) => PAGE_MODEL_NAMES[model][draft.editLocale]).join(", ") })}`
              : ""}
          </p>
          <div className="pub-templates__actions">
            <AdminButton type="button" size="sm" disabled={readOnly} onClick={() => applyTemplate(previewed.id)}>
              {te("apply")}
            </AdminButton>
            <AdminButton type="button" size="sm" variant="secondary" onClick={() => setTemplatePreview(null)}>
              {tc("cancel")}
            </AdminButton>
          </div>
        </div>
      ) : null}
      <div className="pub-editor-choices pub-templates" role="radiogroup" aria-label={te("title")}>
        {SITE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            role="radio"
            aria-checked={templatePreview ? templatePreview === template.id : current === template.id}
            className="pub-editor-choice"
            onClick={() => setTemplatePreview(templatePreview === template.id ? null : template.id)}
          >
            <span
              className="pub-editor-swatch"
              style={resolvePublicThemeStyle(template.themeId) as CSSProperties}
              aria-hidden
            >
              <i />
              <i />
              <i />
            </span>
            <span className="pub-editor-choice__title">{te(`items.${template.id}.name`)}</span>
            <span className="pub-editor-choice__desc">{te(`items.${template.id}.desc`)}</span>
            <span className="pub-templates__meta">
              {t(`templates.${template.templateId}.title`)} · {t(`themes.${template.themeId}.title`)}
            </span>
          </button>
        ))}
      </div>
    </EditorGroup>
  );
}

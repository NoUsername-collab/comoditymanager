"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  PUBLIC_TEMPLATE_OPTIONS,
  PUBLIC_THEME_OPTIONS,
} from "@/features/public-site/domain/defaults";
import { PUBLIC_FONT_OPTIONS } from "@/features/public-site/domain/chrome";
import { resolvePublicThemeStyle } from "@/features/public-site/themes/loader";
import {
  EditorAdvanced,
  EditorGroup,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";

export function PublicSiteDesignPanel() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft } = usePublicSiteEditor();

  // Thumbnails show the operator's own photo, laid out as each layout would.
  const heroPhoto = draft.heroImageUrl.trim();
  const layoutPhoto = heroPhoto
    ? ({ "--thumb-photo": `url(${JSON.stringify(heroPhoto)})` } as CSSProperties)
    : undefined;

  return (
    <>
      <EditorGroup title={te("layoutTitle")} description={te("layoutDesc")}>
        <div className="pub-editor-choices" role="radiogroup" aria-label={te("layoutTitle")}>
          {PUBLIC_TEMPLATE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={draft.templateId === option}
              className="pub-editor-choice"
              // Switching layout restyles the page; the operator's section order stays.
              onClick={() => patchDraft({ templateId: option })}
            >
              <span
                className={`pub-editor-layout pub-editor-layout--${option}`}
                style={layoutPhoto}
                aria-hidden
              >
                <i className="pub-editor-layout__photo" />
                <span className="pub-editor-layout__copy">
                  <i className="pub-editor-layout__title" />
                  <i className="pub-editor-layout__line" />
                  <i className="pub-editor-layout__btn" />
                </span>
              </span>
              <span className="pub-editor-choice__title">{t(`templates.${option}.title`)}</span>
              <span className="pub-editor-choice__desc">{t(`templates.${option}.desc`)}</span>
            </button>
          ))}
        </div>
        {draft.templateId === "immersive" && !draft.heroImageUrl.trim() ? (
          <p className="pub-editor-tabhint" role="status">
            {te("immersiveNeedsPhoto")}
          </p>
        ) : null}
      </EditorGroup>

      <EditorGroup title={te("colorsTitle")} description={te("colorsDesc")}>
        <div className="pub-editor-choices" role="radiogroup" aria-label={te("colorsTitle")}>
          {PUBLIC_THEME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={draft.themeId === option}
              className="pub-editor-choice"
              onClick={() => patchDraft({ themeId: option })}
            >
              <span
                className="pub-editor-swatch"
                style={resolvePublicThemeStyle(option) as CSSProperties}
                aria-hidden
              >
                <i />
                <i />
                <i />
              </span>
              <span className="pub-editor-choice__title">{t(`themes.${option}.title`)}</span>
              <span className="pub-editor-choice__desc">{t(`themes.${option}.desc`)}</span>
            </button>
          ))}
        </div>
      </EditorGroup>

      <EditorAdvanced>
        <div className="admin-settings-fields">
          <label>
            <span>{te("fontTitle")}</span>
            <select
              value={draft.fontId}
              onChange={(e) => patchDraft({ fontId: e.target.value as typeof draft.fontId })}
            >
              {PUBLIC_FONT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`fonts.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </EditorAdvanced>
    </>
  );
}

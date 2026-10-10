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
} from "@/features/settings/ui/PublicSiteEditorKit";

export function PublicSiteDesignPanel() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft } = usePublicSiteEditor();

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
              <span className={`pub-editor-layout pub-editor-layout--${option}`} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="pub-editor-choice__title">{t(`templates.${option}.title`)}</span>
              <span className="pub-editor-choice__desc">{t(`templates.${option}.desc`)}</span>
            </button>
          ))}
        </div>
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

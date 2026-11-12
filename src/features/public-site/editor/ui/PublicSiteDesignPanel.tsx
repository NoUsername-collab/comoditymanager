"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  PUBLIC_TEMPLATE_OPTIONS,
  PUBLIC_THEME_OPTIONS,
} from "@/features/public-site/domain/defaults";
import { LAYOUT_SUGGESTED_FONT, PUBLIC_FONT_OPTIONS } from "@/features/public-site/domain/chrome";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";
import {
  BRAND_COLOR_SUGGESTIONS,
  brandColorFadesOn,
  normalizeBrandColor,
  relativeLuminance,
} from "@/features/public-site/domain/brand-color";
import {
  publicThemeBackground,
  resolvePublicSiteStyle,
  resolvePublicThemeStyle,
} from "@/features/public-site/themes/loader";
import {
  EditorGroup,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { SiteTemplatesGroup } from "@/features/public-site/editor/ui/SiteTemplatesGroup";
import { siteTemplate } from "@/features/public-site/editor/model/site-templates";

export function PublicSiteDesignPanel() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft, templatePreview } = usePublicSiteEditor();
  // While a template is looked at, the choices below show its layout, palette and
  // font (what the preview shows) and wait until it is applied or put away.
  const previewed = templatePreview ? siteTemplate(templatePreview) : undefined;
  const look = previewed
    ? { templateId: previewed.templateId, themeId: previewed.themeId, fontId: previewed.fontId }
    : { templateId: draft.templateId, themeId: draft.themeId, fontId: draft.fontId };

  // The default font follows the layout the page actually shows.
  const layout = effectivePublicTemplate({
    templateId: look.templateId,
    hero: { imageUrl: draft.heroImageUrl },
  });
  const suggestedFont = LAYOUT_SUGGESTED_FONT[layout];

  // Thumbnails show the operator's own photo, laid out as each layout would.
  const heroPhoto = draft.heroImageUrl.trim();
  const layoutPhoto = heroPhoto
    ? ({ "--thumb-photo": `url(${JSON.stringify(heroPhoto)})` } as CSSProperties)
    : undefined;

  return (
    <>
      <SiteTemplatesGroup />

      {previewed ? (
        <p className="pub-editor-tabhint" role="status">
          {te("siteTemplates.choicesWait")}
        </p>
      ) : null}
      <div
        className="pub-design-choices"
        inert={previewed ? true : undefined}
        data-previewing={previewed ? "1" : undefined}
      >
        <EditorGroup title={te("layoutTitle")} description={te("layoutDesc")}>
          <div className="pub-editor-choices" role="radiogroup" aria-label={te("layoutTitle")}>
            {PUBLIC_TEMPLATE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={look.templateId === option}
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
                {/* Below the top: how the layout sets out the sections. */}
                <span className={`pub-editor-sections pub-editor-sections--${option}`} aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="pub-editor-choice__title">{t(`templates.${option}.title`)}</span>
                <span className="pub-editor-choice__desc">{t(`templates.${option}.desc`)}</span>
              </button>
            ))}
          </div>
          {look.templateId === "immersive" && !draft.heroImageUrl.trim() ? (
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
                aria-checked={look.themeId === option}
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

        <BrandColorGroup />

        <EditorGroup title={te("fontTitle")} description={te("fontDesc")}>
          <div className="pub-editor-choices pub-editor-choices--fonts" role="radiogroup" aria-label={te("fontTitle")}>
            {PUBLIC_FONT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={look.fontId === option}
                className="pub-editor-choice"
                onClick={() => patchDraft({ fontId: option })}
              >
                <span
                  className="pub-editor-font-sample"
                  style={resolvePublicSiteStyle(look.themeId, { fontId: option }, layout)}
                  aria-hidden
                >
                  {te("fontSample")}
                </span>
                <span className="pub-editor-choice__title">{t(`fonts.${option}`)}</span>
                {option === "theme" ? (
                  <span className="pub-editor-choice__desc">
                    {suggestedFont
                      ? te("fontFollowsLayout", { font: t(`fonts.${suggestedFont}`) })
                      : te("fontFollowsPalette")}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </EditorGroup>
      </div>
    </>
  );
}

/**
 * The operator's own colour over the palette: a few suggestions, any colour
 * from the picker or by its code, and a word when it fades on the page.
 */
function BrandColorGroup() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft } = usePublicSiteEditor();
  const brand = normalizeBrandColor(draft.accentColor);
  const pageBg = publicThemeBackground(draft.themeId);
  const paletteAccent = resolvePublicThemeStyle(draft.themeId)["--pub-accent"];
  const shown = brand ?? paletteAccent ?? "#000000";

  // The code field keeps what is typed; a full six-digit code applies at once,
  // a short one when the field is left. A colour picked elsewhere replaces it.
  const [code, setCode] = useState(brand ?? "");
  const [codeFor, setCodeFor] = useState(brand);
  if (codeFor !== brand) {
    setCodeFor(brand);
    if (normalizeBrandColor(code) !== brand) setCode(brand ?? "");
  }

  const fades = brand ? brandColorFadesOn(brand, pageBg) : false;
  const lightPage = relativeLuminance(normalizeBrandColor(pageBg) ?? "#ffffff") > 0.5;

  return (
    <EditorGroup title={te("brandTitle")} description={te("brandDesc")}>
      <div className="pub-brand" role="radiogroup" aria-label={te("brandTitle")}>
        <button
          type="button"
          role="radio"
          aria-checked={!brand}
          className="pub-brand__chip pub-brand__chip--palette"
          style={{ "--chip": paletteAccent } as CSSProperties}
          onClick={() => patchDraft({ accentColor: "" })}
        >
          <i aria-hidden />
          {te("brandPalette")}
        </button>
        {BRAND_COLOR_SUGGESTIONS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={brand === color}
            aria-label={color}
            title={color}
            className="pub-brand__chip"
            style={{ "--chip": color } as CSSProperties}
            onClick={() => patchDraft({ accentColor: color })}
          >
            <i aria-hidden />
          </button>
        ))}
      </div>

      <div className="pub-brand__custom">
        <label className="pub-brand__picker">
          <input
            type="color"
            value={shown}
            onChange={(e) => patchDraft({ accentColor: e.target.value })}
          />
          <span>{te("brandCustom")}</span>
        </label>
        <label className="pub-brand__code">
          <span>{te("brandCode")}</span>
          <input
            type="text"
            inputMode="text"
            spellCheck={false}
            maxLength={7}
            placeholder="#b45309"
            value={code}
            onChange={(e) => {
              const typed = e.target.value;
              setCode(typed);
              if (/^#?[0-9a-f]{6}$/i.test(typed.trim())) {
                patchDraft({ accentColor: normalizeBrandColor(typed) ?? "" });
              } else if (!typed.trim()) {
                patchDraft({ accentColor: "" });
              }
            }}
            onBlur={() => {
              const next = normalizeBrandColor(code);
              if (next) patchDraft({ accentColor: next });
              else setCode(brand ?? "");
            }}
          />
        </label>
      </div>

      <div className="pub-brand__sample" style={resolvePublicSiteStyle(draft.themeId, { accentColor: brand })}>
        <span className="pub-brand__sample-btn">{te("brandSampleButton")}</span>
        <span className="pub-brand__sample-mark">{te("brandSampleMark")}</span>
      </div>

      {fades ? (
        <p className="pub-editor-tabhint" role="status">
          {te(lightPage ? "brandFadesOnLight" : "brandFadesOnDark")}
        </p>
      ) : null}
    </EditorGroup>
  );
}

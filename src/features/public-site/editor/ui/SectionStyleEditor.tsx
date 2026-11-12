"use client";

import { useTranslations } from "next-intl";
import { EditorAdvanced } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { useSectionEditing } from "@/features/public-site/editor/ui/section-editing";
import type { SectionDraft } from "@/features/public-site/editor/model/section-draft";
import {
  SECTION_ALIGNS,
  SECTION_BACKGROUNDS,
  SECTION_LOOKS,
  SECTION_WIDTHS,
  styleFromSettings,
  styleSettingKey,
  type SectionStyle,
} from "@/features/public-site/domain/section-style";

const OPTIONS: { [K in keyof SectionStyle]: readonly SectionStyle[K][] } = {
  look: SECTION_LOOKS,
  background: SECTION_BACKGROUNDS,
  width: SECTION_WIDTHS,
  align: SECTION_ALIGNS,
};

/**
 * How this one section looks, over the page layout: its own layout, its
 * background, its width and where its heading sits. Every choice starts at
 * "as the page", so a section left alone follows the page.
 */
export function SectionStyleEditor({ section }: { section: SectionDraft }) {
  const te = useTranslations("admin.pages.publicSite.editor.sectionStyle");
  const ed = useSectionEditing(section);
  const style = styleFromSettings(section.settings);
  const changed = (Object.keys(OPTIONS) as (keyof SectionStyle)[]).filter((key) => style[key] !== "auto");

  return (
    <EditorAdvanced label={changed.length > 0 ? te("titleChanged", { count: changed.length }) : te("title")}>
      <p className="pub-section-style__hint">{te("hint")}</p>
      {(Object.keys(OPTIONS) as (keyof SectionStyle)[]).map((key) => (
        <fieldset key={key} className="pub-section-style__group">
          <legend>{te(`${key}.label`)}</legend>
          <div className="pub-section-style__options" role="radiogroup" aria-label={te(`${key}.label`)}>
            {OPTIONS[key].map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={style[key] === option}
                className="pub-section-style__option"
                disabled={ed.readOnly}
                onClick={() => ed.setSetting(styleSettingKey(key))(option)}
              >
                {key === "background" && option !== "auto" ? (
                  <i className={`pub-section-style__swatch pub-section-style__swatch--${option}`} aria-hidden />
                ) : null}
                {te(`${key}.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {changed.length > 0 ? (
        <button
          type="button"
          className="pub-section-style__reset"
          disabled={ed.readOnly}
          onClick={() => changed.forEach((key) => ed.setSetting(styleSettingKey(key))("auto"))}
        >
          {te("reset")}
        </button>
      ) : null}
    </EditorAdvanced>
  );
}

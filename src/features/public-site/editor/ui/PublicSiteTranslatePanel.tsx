"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  PUBLIC_LOCALES,
  type PublicLocale,
  type PublicStockCopy,
} from "@/features/public-site/domain/types";
import {
  missingCount,
  rowMissing,
  setTranslation,
  translationGroups,
  type TranslationGroup,
  type TranslationRow,
} from "@/features/public-site/editor/model/translation";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";

/** Lines a box needs for the longer of the two texts, a few at most. */
function rowsFor(...texts: string[]): number {
  const lines = Math.max(
    ...texts.map((text) => text.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 56)), 0)),
  );
  return Math.min(10, Math.max(1, lines));
}

/**
 * Every text of the site on one screen: the language translated from on the
 * left, the language being edited on the right. Typing here is the same edit as
 * in the text's own screen, so undo, the preview and the save all follow.
 */
export function PublicSiteTranslatePanel({
  stock,
  progress,
}: {
  /** The site's default texts, which do not count as a translation of the operator's own. */
  stock: PublicStockCopy;
  /** Each language's progress, as the language tabs show it. */
  progress: Record<PublicLocale, number>;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, setDraft, readOnly } = usePublicSiteEditor();
  const to = draft.editLocale;

  // Translate from the most complete other language unless one was picked.
  const others = PUBLIC_LOCALES.filter((locale) => locale !== to);
  const best = [...others].sort((a, b) => progress[b] - progress[a])[0]!;
  const [picked, setPicked] = useState<PublicLocale | null>(null);
  const from = picked && picked !== to ? picked : best;
  const [onlyMissing, setOnlyMissing] = useState(false);

  const groups = translationGroups(draft, from, to, stock);
  const missing = missingCount(groups);
  const shown = groups
    .map((group) => ({ ...group, rows: onlyMissing ? group.rows.filter(rowMissing) : group.rows }))
    .filter((group) => group.rows.length > 0);

  const language = (locale: PublicLocale) => t(`localeTab_${locale}`);
  const groupTitle = (group: TranslationGroup) =>
    group.part
      ? te(`translate.parts.${group.part}`)
      : group.section!.title || te(`cards.${group.section!.type}.name`);
  const rowLabel = (row: TranslationRow) => {
    const label = te(`translate.fields.${row.field}`);
    return row.itemIndex ? te("translate.inItem", { index: row.itemIndex, label }) : label;
  };

  return (
    <div className="pub-translate">
      <div className="pub-translate__bar">
        <label className="pub-translate__from">
          <span>{te("translate.from")}</span>
          <select value={from} onChange={(e) => setPicked(e.target.value as PublicLocale)}>
            {others.map((locale) => (
              <option key={locale} value={locale}>
                {language(locale)}
              </option>
            ))}
          </select>
          <span>{te("translate.into", { language: language(to) })}</span>
        </label>
        <label className="pub-translate__filter">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          <span>{te("translate.onlyMissing", { count: missing })}</span>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="pub-editor-tabhint" role="status">
          {missing === 0 ? te("translate.allDone", { language: language(to) }) : te("translate.nothing")}
        </p>
      ) : null}

      {shown.map((group) => (
        <section key={group.id} className="pub-translate__group" aria-label={groupTitle(group)}>
          <h3 className="pub-translate__group-title">{groupTitle(group)}</h3>
          <div className="pub-translate__head" aria-hidden>
            <span>{language(from)}</span>
            <span>{language(to)}</span>
          </div>
          {group.rows.map((row) => {
            const id = `pub-translate-${row.path.replace(/[^a-z0-9]/gi, "-")}`;
            return (
              <div key={row.path} className="pub-translate__row" data-missing={rowMissing(row) ? "1" : undefined}>
                <label className="pub-translate__label" htmlFor={id}>
                  {rowLabel(row)}
                  {row.copied ? (
                    <em className="pub-translate__copied">{te("translate.copied")}</em>
                  ) : row.stock ? (
                    <em className="pub-translate__copied">{te("translate.stock")}</em>
                  ) : row.target.trim() && row.target.trim() === row.source.trim() ? (
                    // A name reads the same everywhere; a sentence probably was never translated.
                    <em className="pub-translate__same">{te("translate.same")}</em>
                  ) : null}
                </label>
                <p className="pub-translate__source" lang={from}>
                  {row.source || <span className="pub-translate__empty">{te("translate.emptySource")}</span>}
                </p>
                <textarea
                  id={id}
                  className="pub-translate__input"
                  lang={to}
                  rows={rowsFor(row.source, row.target)}
                  value={row.target}
                  readOnly={readOnly}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft((d) => setTranslation(d, d.editLocale, row.path, value));
                  }}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

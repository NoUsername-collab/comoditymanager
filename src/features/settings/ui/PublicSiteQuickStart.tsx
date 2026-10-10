"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { resolvePublicThemeStyle } from "@/features/public-site/themes/loader";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { PublicSiteImageField } from "@/features/settings/ui/PublicSiteImageField";
import { EditorField } from "@/features/settings/ui/PublicSiteEditorKit";
import {
  PUBLIC_STYLE_PRESETS,
  type QuickStartAnswers,
} from "@/features/settings/ui/public-site-editor-model";

const STEPS = ["about", "photos", "style", "contact"] as const;
const MAX_QUICK_PHOTOS = 8;

/** Four plain questions that fill a usable homepage; everything stays editable after. */
export function PublicSiteQuickStart({
  initial,
  displayName,
  onFinish,
  onClose,
}: {
  initial: QuickStartAnswers;
  displayName: string;
  onFinish: (answers: QuickStartAnswers) => void;
  onClose: () => void;
}) {
  const t = useTranslations("admin.pages.publicSite.editor.quickStart");
  const tSite = useTranslations("admin.pages.publicSite");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuickStartAnswers>(() => ({
    ...initial,
    heroTitle: initial.heroTitle || displayName,
    galleryUrls: [...initial.galleryUrls, ""],
  }));
  const dialogRef = useRef<HTMLDivElement>(null);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [step]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  function patch(partial: Partial<QuickStartAnswers>) {
    setAnswers((a) => ({ ...a, ...partial }));
  }

  function setPhoto(index: number, url: string) {
    setAnswers((a) => {
      const urls = a.galleryUrls.map((row, i) => (i === index ? url : row));
      // Keep one empty slot at the end so the next photo is one tap away.
      if (urls[urls.length - 1]?.trim() && urls.length < MAX_QUICK_PHOTOS) urls.push("");
      return { ...a, galleryUrls: urls };
    });
  }

  return (
    <div className="pub-quickstart" role="presentation">
      <div
        ref={dialogRef}
        className="pub-quickstart__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pub-quickstart-title"
      >
        <header className="pub-quickstart__head">
          <p className="pub-quickstart__progress">
            {t("progress", { step: step + 1, total: STEPS.length })}
          </p>
          <h2 id="pub-quickstart-title">{t(`steps.${current}.title`)}</h2>
          <p>{t(`steps.${current}.lead`)}</p>
          <ol className="pub-quickstart__dots" aria-hidden>
            {STEPS.map((key, index) => (
              <li key={key} data-active={index <= step ? "1" : undefined} />
            ))}
          </ol>
        </header>

        <div className="pub-quickstart__body">
          {current === "about" ? (
            <div className="admin-settings-fields">
              <EditorField
                label={t("nameLabel")}
                value={answers.heroTitle}
                placeholder={displayName}
                onChange={(heroTitle) => patch({ heroTitle })}
              />
              <EditorField
                rows={2}
                label={t("subtitleLabel")}
                value={answers.heroSubtitle}
                placeholder={t("subtitlePlaceholder")}
                onChange={(heroSubtitle) => patch({ heroSubtitle })}
              />
              <EditorField
                rows={4}
                label={t("introLabel")}
                value={answers.introLead}
                placeholder={t("introPlaceholder")}
                onChange={(introLead) => patch({ introLead })}
                hint={t("introHint")}
              />
            </div>
          ) : null}

          {current === "photos" ? (
            <div className="pub-quickstart__photos">
              <PublicSiteImageField
                kind="hero"
                label={t("heroPhotoLabel")}
                value={answers.heroImageUrl}
                onChange={(heroImageUrl) => patch({ heroImageUrl })}
                hint={t("heroPhotoHint")}
              />
              <p className="pub-quickstart__subhead">{t("galleryLabel")}</p>
              <div className="pub-quickstart__grid">
                {answers.galleryUrls.map((url, index) => (
                  <PublicSiteImageField
                    key={index}
                    kind="gallery"
                    label={tSite("galleryPhotoLabel", { index: index + 1 })}
                    value={url}
                    onChange={(next) => setPhoto(index, next)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {current === "style" ? (
            <div className="pub-editor-choices" role="radiogroup" aria-label={t("steps.style.title")}>
              {PUBLIC_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={answers.styleId === preset.id}
                  className="pub-editor-choice"
                  onClick={() => patch({ styleId: preset.id })}
                >
                  <span
                    className="pub-editor-swatch"
                    style={resolvePublicThemeStyle(preset.themeId) as CSSProperties}
                    aria-hidden
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="pub-editor-choice__title">{t(`styles.${preset.id}.title`)}</span>
                  <span className="pub-editor-choice__desc">{t(`styles.${preset.id}.desc`)}</span>
                </button>
              ))}
            </div>
          ) : null}

          {current === "contact" ? (
            <div className="admin-settings-fields">
              <EditorField
                label={t("phoneLabel")}
                type="tel"
                value={answers.contactPhone}
                placeholder="+40 7xx xxx xxx"
                onChange={(contactPhone) => patch({ contactPhone })}
              />
              <EditorField
                label={t("emailLabel")}
                type="email"
                value={answers.contactEmail}
                onChange={(contactEmail) => patch({ contactEmail })}
                hint={t("contactHint")}
              />
            </div>
          ) : null}
        </div>

        <footer className="pub-quickstart__foot">
          <button type="button" className="pub-quickstart__skip" onClick={onClose}>
            {t("skip")}
          </button>
          <div className="pub-quickstart__nav">
            {step > 0 ? (
              <AdminButton type="button" variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                {t("back")}
              </AdminButton>
            ) : null}
            <AdminButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => (last ? onFinish(answers) : setStep(step + 1))}
            >
              {last ? t("finish") : t("next")}
            </AdminButton>
          </div>
        </footer>
      </div>
    </div>
  );
}

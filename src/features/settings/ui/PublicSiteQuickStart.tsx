"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { resolvePublicThemeStyle } from "@/features/public-site/themes/loader";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { PublicSiteImageField } from "@/features/settings/ui/PublicSiteImageField";
import { EditorField } from "@/features/settings/ui/PublicSiteEditorKit";
import { IdentityContactSummary } from "@/features/settings/ui/IdentityContactSummary";
import {
  PUBLIC_STYLE_PRESETS,
  type QuickStartAnswers,
} from "@/features/settings/ui/public-site-editor-model";

const STEPS = ["about", "photos", "style", "contact"] as const;
const MAX_QUICK_PHOTOS = 8;

/**
 * Four plain questions that fill a usable homepage; everything stays editable after.
 * Sits in the editor column so the live preview next to it follows every answer.
 */
export function PublicSiteQuickStart({
  initial,
  contact,
  displayName,
  language,
  otherLanguages,
  onChange,
  onFinish,
  onClose,
}: {
  initial: QuickStartAnswers;
  /** What visitors will see, taken from Property identity. */
  contact: { phone?: string | null; email?: string | null; whatsapp?: string | null };
  displayName: string;
  /** Name of the language being written, e.g. „Română”. */
  language: string;
  /** Names of the languages the answers do not fill. */
  otherLanguages: string[];
  onChange: (answers: QuickStartAnswers) => void;
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
  const dialogRef = useRef<HTMLElement>(null);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  useEffect(() => {
    dialogRef.current?.scrollIntoView({ block: "start" });
    dialogRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [step]);

  useEffect(() => {
    onChange(answers);
  }, [answers, onChange]);

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
    <section ref={dialogRef} className="pub-quickstart" aria-labelledby="pub-quickstart-title">
      <div className="pub-quickstart__dialog">
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
              <IdentityContactSummary
                contact={{
                  phone: contact.phone ?? null,
                  email: contact.email ?? null,
                  whatsapp: contact.whatsapp ?? null,
                }}
                lead={t("contactFromIdentity")}
              />
              {otherLanguages.length > 0 ? (
                <p className="pub-quickstart__note">
                  {t("languageNote", { language, others: otherLanguages.join(", ") })}
                </p>
              ) : null}
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
    </section>
  );
}

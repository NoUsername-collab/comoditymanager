"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PUBLIC_TEMPLATE_OPTIONS,
  PUBLIC_THEME_OPTIONS,
} from "@/features/public-site/domain/defaults";
import { PUBLIC_FONT_OPTIONS } from "@/features/public-site/domain/chrome";
import { applyTemplateSectionKeys } from "@/features/public-site/domain/order-sections";
import {
  PUBLIC_BENEFIT_ICON_IDS,
} from "@/features/public-site/domain/benefit-icons";
import type { BookingNoticeDraft } from "@/features/public-site/domain/booking-notice";
import type {
  PublicLocale,
  PublicSiteConfig,
  PublicSiteSettingsInput,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import { BookingNoticeEditor } from "@/features/settings/ui/BookingNoticeEditor";
import { PublicSiteImageField } from "@/features/settings/ui/PublicSiteImageField";
import { PublicSiteLocaleTabs } from "@/features/settings/ui/PublicSiteLocaleTabs";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { savePublicSiteSettingsAction } from "@/features/settings/actions/public-site";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { PublicSitePreview } from "@/features/settings/ui/PublicSitePreview";
import { PublicSiteStudio } from "@/features/settings/ui/PublicSiteStudio";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { SettingsFieldError } from "@/components/admin/settings/SettingsFieldError";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";
import {
  addStudioBenefit,
  addStudioStep,
  addStudioTextSection,
  buildPublicSiteStudioDraft,
  MAX_BENEFIT_ITEMS,
  MAX_STEP_ITEMS,
  MAX_TEXT_SECTIONS,
  mergeStudioToInput,
  moveStudioSection,
  nextGalleryDraftId,
  patchStudioCopy,
  removeStudioBenefit,
  removeStudioStep,
  removeStudioTextSection,
  studioLocaleGaps,
  switchStudioLocale,
  syncStudioStructure,
  type CopyLineDraft,
  type LocaleCopy,
  type PublicSiteStudioDraft,
  type StepLineDraft,
} from "@/features/settings/ui/public-site-studio-draft";

function FormSection({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <SettingsSection title={title} description={description} defaultOpen={defaultOpen}>
      {children}
    </SettingsSection>
  );
}

export function PublicSiteSettingsForm({
  config,
  locale,
  primaryContact,
  readOnly = false,
  alerts = [],
}: {
  config: PublicSiteConfig;
  locale: string;
  primaryContact: PensionContact;
  readOnly?: boolean;
  alerts?: SettingsAlert[];
}) {
  const t = useTranslations("admin.pages.publicSite");
  const tSettings = useTranslations("admin.pages.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function fieldError(...paths: string[]): string | undefined {
    for (const path of paths) {
      if (fieldErrors[path]) return fieldErrors[path];
    }
    const key = Object.keys(fieldErrors).find((candidate) =>
      paths.some((path) => candidate === path || candidate.startsWith(`${path}.`)),
    );
    return key ? fieldErrors[key] : undefined;
  }

  const [draft, setDraft] = useState<PublicSiteStudioDraft>(() =>
    buildPublicSiteStudioDraft(config, locale),
  );
  const copy = draft.copies[draft.editLocale];

  function patchDraft(partial: Partial<PublicSiteStudioDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function patchCopy(partial: Partial<LocaleCopy>) {
    setDraft((d) => patchStudioCopy(d, partial));
  }

  function setEditLocale(next: PublicLocale) {
    setDraft((d) => switchStudioLocale(d, next));
  }

  function addGalleryItem() {
    setDraft((d) => {
      const id = nextGalleryDraftId();
      const copies = { ...d.copies };
      for (const loc of PUBLIC_LOCALES) {
        copies[loc] = {
          ...copies[loc],
          galleryCaptions: { ...copies[loc].galleryCaptions, [id]: "" },
        };
      }
      return {
        ...d,
        galleryItems: [...d.galleryItems, { id, url: "" }],
        copies,
      };
    });
  }

  function removeGalleryItem(id: string) {
    setDraft((d) => ({
      ...d,
      galleryItems: d.galleryItems.filter((item) => item.id !== id),
    }));
  }

  function moveGalleryItem(id: string, direction: -1 | 1) {
    setDraft((d) => {
      const items = d.galleryItems;
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= items.length) return d;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return { ...d, galleryItems: next };
    });
  }

  function updateGalleryUrl(id: string, url: string) {
    setDraft((d) => ({
      ...d,
      galleryItems: d.galleryItems.map((item) =>
        item.id === id ? { ...item, url } : item,
      ),
    }));
  }

  function updateGalleryCaption(id: string, caption: string) {
    setDraft((d) =>
      patchStudioCopy(d, {
        galleryCaptions: { ...d.copies[d.editLocale].galleryCaptions, [id]: caption },
      }),
    );
  }

  function updateBenefitItem(index: number, patch: Partial<CopyLineDraft>) {
    setDraft((d) => {
      const current = d.copies[d.editLocale];
      const next = patchStudioCopy(d, {
        benefitItems: current.benefitItems.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
      return patch.icon !== undefined ? syncStudioStructure(next) : next;
    });
  }

  function updateStepItem(index: number, patch: Partial<StepLineDraft>) {
    setDraft((d) =>
      patchStudioCopy(d, {
        stepItems: d.copies[d.editLocale].stepItems.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      }),
    );
  }

  function patchNotice(noticeDraft: BookingNoticeDraft) {
    setDraft((d) => syncStudioStructure(patchStudioCopy(d, { noticeDraft })));
  }

  function addBenefit() {
    setDraft((d) => addStudioBenefit(d));
  }
  function removeBenefit(index: number) {
    setDraft((d) => removeStudioBenefit(d, index));
  }
  function addStep() {
    setDraft((d) => addStudioStep(d));
  }
  function removeStep(index: number) {
    setDraft((d) => removeStudioStep(d, index));
  }
  function addTextSection() {
    setDraft((d) => addStudioTextSection(d));
  }
  function removeTextSection(id: string) {
    setDraft((d) => removeStudioTextSection(d, id));
  }
  function moveSection(key: string, direction: -1 | 1) {
    setDraft((d) => moveStudioSection(d, key, direction));
  }

  const localeGaps = studioLocaleGaps(draft);

  const draftInput = useMemo(
    () => mergeStudioToInput({ config, draft }),
    [config, draft],
  );

  const previewConfig = useMemo(
    () => buildPublicSiteConfigFromInput(config, draftInput, primaryContact),
    [config, draftInput, primaryContact],
  );

  const initialSnapshot = useRef(JSON.stringify(draftInput));
  const dirty = JSON.stringify(draftInput) !== initialSnapshot.current;
  useSettingsUnsavedWarning(!readOnly && dirty);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const payload = mergeStudioToInput({ config, draft });
    startTransition(async () => {
      const result = await savePublicSiteSettingsAction(payload);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      } else {
        initialSnapshot.current = JSON.stringify(payload);
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  return (
    <PublicSiteStudio
      published={draft.published}
      editLocale={draft.editLocale}
      dirty={dirty}
      preview={<PublicSitePreview config={previewConfig} locale={draft.editLocale} />}
      localeTabs={
        <PublicSiteLocaleTabs
          variant="chrome"
          value={draft.editLocale}
          onChange={setEditLocale}
          disabled={readOnly}
        />
      }
      saveControl={
        readOnly ? null : (
          <AdminSubmitButton
            form="public-site-studio-form"
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
          >
            {pending ? t("saving") : t("save")}
          </AdminSubmitButton>
        )
      }
      banner={
        <>
          <SettingsAlerts alerts={alerts} />
          {!readOnly && dirty ? (
            <p className="settings-unsaved-banner pub-site-studio__unsaved" role="status">
              {tSettings("unsavedChanges")}
            </p>
          ) : null}
          {error ? (
            <div className="settings-alerts">
              <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                {error}
              </p>
            </div>
          ) : null}
        </>
      }
      form={
        <form
          id="public-site-studio-form"
          onSubmit={handleSubmit}
          className="settings-form-stack"
        >
          <fieldset disabled={readOnly} className="settings-form-stack border-0 p-0 m-0 min-w-0">
            <SettingsFieldHint className="mb-3 block">
              {t("localeEditHint", { locale: draft.editLocale.toUpperCase() })}
            </SettingsFieldHint>
            {localeGaps.length > 0 ? (
              <SettingsFieldHint className="mb-3 block">
                {t("localeGaps", {
                  locales: localeGaps.map((row) => row.locale.toUpperCase()).join(", "),
                })}
              </SettingsFieldHint>
            ) : null}

      <FormSection title={t("publishTitle")} description={t("publishedHint")}>
        <label className="pub-settings-section-toggle">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => patchDraft({ published: e.target.checked })}
          />
          {t("published")}
        </label>
      </FormSection>

      <FormSection title={t("brandTitle")} description={t("brandSectionDesc")}>
        <PublicSiteImageField
          kind="logo"
          label={t("logoLabel")}
          value={draft.logoUrl}
          onChange={(url) => patchDraft({ logoUrl: url })}
          hint={t("logoHint")}
          error={fieldError("chrome.logoUrl")}
          disabled={readOnly}
        />
        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("headerSubtitle")}</span>
            <input
              value={copy.headerSubtitle}
              onChange={(e) => patchCopy({ headerSubtitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("footerTagline")}</span>
            <textarea
              rows={2}
              value={copy.footerTagline}
              onChange={(e) => patchCopy({ footerTagline: e.target.value })}
            />
          </label>
          <label>
            <span>{t("fontTitle")}</span>
            <select
              value={draft.fontId}
              onChange={(e) =>
                patchDraft({ fontId: e.target.value as typeof draft.fontId })
              }
            >
              {PUBLIC_FONT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`fonts.${option}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showContactBar}
              onChange={(e) => patchDraft({ showContactBar: e.target.checked })}
            />
            {t("showContactBar")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showStayOffers}
              onChange={(e) => patchDraft({ showStayOffers: e.target.checked })}
            />
            {t("showStayOffers")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showStayPrices}
              onChange={(e) => patchDraft({ showStayPrices: e.target.checked })}
            />
            {t("showStayPrices")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showPlace}
              onChange={(e) => patchDraft({ showPlace: e.target.checked })}
            />
            {t("showPlace")}
          </label>
        </div>
        <SettingsFieldHint className="mt-3 block">{t("livePropertyHint")}</SettingsFieldHint>
      </FormSection>

      <FormSection title={t("navTitle")} description={t("navSectionDesc")}>
        <div className="pub-settings-toggles mb-3">
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showNavHome}
              onChange={(e) => patchDraft({ showNavHome: e.target.checked })}
            />
            {t("showNavHome")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showNavPrivacy}
              onChange={(e) => patchDraft({ showNavPrivacy: e.target.checked })}
            />
            {t("showNavPrivacy")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.showNavTerms}
              onChange={(e) => patchDraft({ showNavTerms: e.target.checked })}
            />
            {t("showNavTerms")}
          </label>
        </div>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label>
            <span>{t("navHomeLabel")}</span>
            <input value={copy.navHome} onChange={(e) => patchCopy({ navHome: e.target.value })} />
          </label>
          <label>
            <span>{t("navPrivacyLabel")}</span>
            <input value={copy.navPrivacy} onChange={(e) => patchCopy({ navPrivacy: e.target.value })} />
          </label>
          <label>
            <span>{t("navTermsLabel")}</span>
            <input value={copy.navTerms} onChange={(e) => patchCopy({ navTerms: e.target.value })} />
          </label>
          <label>
            <span>{t("navBookLabel")}</span>
            <input value={copy.navBook} onChange={(e) => patchCopy({ navBook: e.target.value })} />
          </label>
        </div>
      </FormSection>

      <FormSection title={t("templateTitle")} description={t("templateSectionDesc")}>
        <div className="pub-settings-grid pub-settings-grid--3" role="radiogroup" aria-label={t("templateTitle")}>
          {PUBLIC_TEMPLATE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={draft.templateId === option}
              className={[
                "pub-settings-card",
                draft.templateId === option && "pub-settings-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  templateId: option,
                  sectionOrder: applyTemplateSectionKeys(d.sectionOrder, option),
                }))
              }
            >
              <p className="pub-settings-card__title">{t(`templates.${option}.title`)}</p>
              <p className="pub-settings-card__desc">{t(`templates.${option}.desc`)}</p>
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title={t("themeTitle")} description={t("themeSectionDesc")}>
        <div className="pub-settings-grid pub-settings-grid--3" role="radiogroup" aria-label={t("themeTitle")}>
          {PUBLIC_THEME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={draft.themeId === option}
              className={[
                "pub-settings-card",
                draft.themeId === option && "pub-settings-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => patchDraft({ themeId: option })}
            >
              <p className="pub-settings-card__title">{t(`themes.${option}.title`)}</p>
              <p className="pub-settings-card__desc">{t(`themes.${option}.desc`)}</p>
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title={t("heroSectionTitle")} description={t("heroSectionDesc")}>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label>
            <span>{t("heroTitle")}</span>
            <input
              value={copy.heroTitle}
              aria-invalid={!!fieldError("hero.title")}
              placeholder={config.displayName}
              onChange={(e) => patchCopy({ heroTitle: e.target.value })}
            />
            {fieldError("hero.title") ? (
              <SettingsFieldError>{fieldError("hero.title")}</SettingsFieldError>
            ) : (
              <SettingsFieldHint>{t("heroTitleHint")}</SettingsFieldHint>
            )}
          </label>
          <label>
            <span>{t("heroBadge")}</span>
            <input
              value={copy.heroBadge}
              onChange={(e) => patchCopy({ heroBadge: e.target.value })}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroSubtitle")}</span>
            <textarea
              rows={2}
              value={copy.heroSubtitle}
              onChange={(e) => patchCopy({ heroSubtitle: e.target.value })}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroTagline")}</span>
            <textarea
              rows={2}
              value={copy.heroTagline}
              onChange={(e) => patchCopy({ heroTagline: e.target.value })}
            />
          </label>
          <label>
            <span>{t("heroCtaPrimary")}</span>
            <input
              value={copy.heroCtaPrimary}
              onChange={(e) => patchCopy({ heroCtaPrimary: e.target.value })}
            />
          </label>
          <label>
            <span>{t("heroCtaSecondary")}</span>
            <input
              value={copy.heroCtaSecondary}
              onChange={(e) => patchCopy({ heroCtaSecondary: e.target.value })}
            />
          </label>
          <div className="admin-settings-fields__full">
            <PublicSiteImageField
              kind="hero"
              label={t("heroImageLabel")}
              value={draft.heroImageUrl}
              onChange={(url) => patchDraft({ heroImageUrl: url })}
              hint={t("heroImageHint")}
              error={fieldError("hero.imageUrl")}
              disabled={readOnly}
            />
          </div>
          <label>
            <span>{t("heroCtaPrimaryHref")}</span>
            <input
              value={draft.heroCtaPrimaryHref}
              onChange={(e) => patchDraft({ heroCtaPrimaryHref: e.target.value })}
            />
          </label>
          <label>
            <span>{t("heroCtaSecondaryHref")}</span>
            <input
              value={draft.heroCtaSecondaryHref}
              onChange={(e) => patchDraft({ heroCtaSecondaryHref: e.target.value })}
            />
          </label>
          <label className="pub-settings-section-toggle admin-settings-fields__full">
            <input
              type="checkbox"
              checked={draft.showCheckTimes}
              onChange={(e) => patchDraft({ showCheckTimes: e.target.checked })}
            />
            {t("showCheckTimes")}
          </label>
        </div>
      </FormSection>

      <FormSection title={t("seoTitle")} description={t("seoSectionDesc")}>
        <div className="admin-settings-fields">
          <label>
            <span>{t("seoMetaTitle")}</span>
            <input
              value={copy.seoTitle}
              onChange={(e) => patchCopy({ seoTitle: e.target.value })}
            />
            <SettingsFieldHint>{t("seoMetaTitleHint")}</SettingsFieldHint>
          </label>
          <label>
            <span>{t("seoMetaDescription")}</span>
            <textarea
              rows={3}
              value={copy.seoDescription}
              onChange={(e) => patchCopy({ seoDescription: e.target.value })}
            />
            <SettingsFieldHint>{t("seoMetaDescriptionHint")}</SettingsFieldHint>
          </label>
          <div className="admin-settings-fields__full">
            <PublicSiteImageField
              kind="og"
              label={t("ogImageLabel")}
              value={draft.ogImageUrl}
              onChange={(url) => patchDraft({ ogImageUrl: url })}
              hint={t("ogImageHint")}
              error={fieldError("pages.ogImageUrl")}
              disabled={readOnly}
            />
          </div>
          <label>
            <span>{t("seoCalendarTitle")}</span>
            <input
              value={copy.seoCalendarTitle}
              onChange={(e) => patchCopy({ seoCalendarTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("seoCalendarDescription")}</span>
            <textarea
              rows={2}
              value={copy.seoCalendarDescription}
              onChange={(e) => patchCopy({ seoCalendarDescription: e.target.value })}
            />
          </label>
          <label>
            <span>{t("seoTermsTitle")}</span>
            <input
              value={copy.seoTermsTitle}
              onChange={(e) => patchCopy({ seoTermsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("seoTermsDescription")}</span>
            <textarea
              rows={2}
              value={copy.seoTermsDescription}
              onChange={(e) => patchCopy({ seoTermsDescription: e.target.value })}
            />
          </label>
          <label>
            <span>{t("seoPrivacyTitle")}</span>
            <input
              value={copy.seoPrivacyTitle}
              onChange={(e) => patchCopy({ seoPrivacyTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("seoPrivacyDescription")}</span>
            <textarea
              rows={2}
              value={copy.seoPrivacyDescription}
              onChange={(e) => patchCopy({ seoPrivacyDescription: e.target.value })}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title={t("contactTitle")} description={t("contactSectionDesc")}>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.usePrimaryContact}
            onChange={(e) => patchDraft({ usePrimaryContact: e.target.checked })}
          />
          <span>{t("usePrimaryContact")}</span>
        </label>
        <SettingsFieldHint className="mb-3 block">{t("usePrimaryContactHint")}</SettingsFieldHint>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={draft.contactEmail}
              aria-invalid={!!fieldError("contact.email")}
              onChange={(e) => patchDraft({ contactEmail: e.target.value })}
            />
            {fieldError("contact.email") ? (
              <SettingsFieldError>{fieldError("contact.email")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>{t("phone")}</span>
            <input
              value={draft.contactPhone}
              aria-invalid={!!fieldError("contact.phone")}
              onChange={(e) => patchDraft({ contactPhone: e.target.value })}
            />
            {fieldError("contact.phone") ? (
              <SettingsFieldError>{fieldError("contact.phone")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>WhatsApp</span>
            <input
              value={draft.contactWhatsapp}
              aria-invalid={!!fieldError("contact.whatsapp")}
              onChange={(e) => patchDraft({ contactWhatsapp: e.target.value })}
              placeholder="+40..."
            />
            {fieldError("contact.whatsapp") ? (
              <SettingsFieldError>{fieldError("contact.whatsapp")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Telegram</span>
            <input
              value={draft.contactTelegram}
              aria-invalid={!!fieldError("contact.telegram")}
              onChange={(e) => patchDraft({ contactTelegram: e.target.value })}
              placeholder="@username"
            />
            {fieldError("contact.telegram") ? (
              <SettingsFieldError>{fieldError("contact.telegram")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Facebook</span>
            <input
              value={draft.contactFacebook}
              aria-invalid={!!fieldError("contact.facebook")}
              onChange={(e) => patchDraft({ contactFacebook: e.target.value })}
            />
            {fieldError("contact.facebook") ? (
              <SettingsFieldError>{fieldError("contact.facebook")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Instagram</span>
            <input
              value={draft.contactInstagram}
              aria-invalid={!!fieldError("contact.instagram")}
              onChange={(e) => patchDraft({ contactInstagram: e.target.value })}
            />
            {fieldError("contact.instagram") ? (
              <SettingsFieldError>{fieldError("contact.instagram")}</SettingsFieldError>
            ) : null}
          </label>
        </div>
      </FormSection>

      <FormSection title={t("sectionsTitle")} description={t("sectionsSectionDesc")}>
        <div className="pub-settings-toggles">
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.introVisible}
              onChange={(e) => patchDraft({ introVisible: e.target.checked })}
            />
            {t("sectionIntro")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.benefitsVisible}
              onChange={(e) => patchDraft({ benefitsVisible: e.target.checked })}
            />
            {t("sectionBenefits")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.stepsVisible}
              onChange={(e) => patchDraft({ stepsVisible: e.target.checked })}
            />
            {t("sectionSteps")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.ctaVisible}
              onChange={(e) => patchDraft({ ctaVisible: e.target.checked })}
            />
            {t("sectionCta")}
          </label>
        </div>
        <p className="mt-4 text-sm font-medium">{t("sectionOrderTitle")}</p>
        <ul className="pub-gallery-editor mt-2">
          {draft.sectionOrder.map((key, index) => (
            <li key={key} className="pub-gallery-editor__actions mb-1 flex items-center gap-2">
              <span className="text-sm">
                {key.startsWith("text:") ? t("sectionText") : t(`sectionKey.${key}`)}
              </span>
              <button
                type="button"
                className="pub-gallery-editor__icon-btn"
                aria-label={t("galleryMoveUp")}
                disabled={index === 0}
                onClick={() => moveSection(key, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="pub-gallery-editor__icon-btn"
                aria-label={t("galleryMoveDown")}
                disabled={index === draft.sectionOrder.length - 1}
                onClick={() => moveSection(key, 1)}
              >
                ↓
              </button>
            </li>
          ))}
        </ul>
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={addTextSection}
          disabled={copy.textItems.length >= MAX_TEXT_SECTIONS}
        >
          {t("textAdd")}
        </AdminButton>
      </FormSection>

      <FormSection title={t("pageCopyTitle")} description={t("pageCopyDesc")} defaultOpen={false}>
        <div className="admin-settings-fields">
          <label>
            <span>{t("sectionIntro")}</span>
            <input
              value={copy.introTitle}
              onChange={(e) => patchCopy({ introTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("introLead")}</span>
            <textarea
              rows={3}
              value={copy.introLead}
              onChange={(e) => patchCopy({ introLead: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionBenefits")}</span>
            <input
              value={copy.benefitsTitle}
              onChange={(e) => patchCopy({ benefitsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("benefitsLead")}</span>
            <textarea
              rows={2}
              value={copy.benefitsLead}
              onChange={(e) => patchCopy({ benefitsLead: e.target.value })}
            />
          </label>
        </div>
        {copy.benefitItems.map((item, index) => (
          <div key={`benefit-${index}`} className="admin-settings-fields admin-settings-fields--2col mt-3">
            <label>
              <span>{t("benefitIcon")}</span>
              <select
                value={item.icon}
                onChange={(e) => updateBenefitItem(index, { icon: e.target.value })}
              >
                {PUBLIC_BENEFIT_ICON_IDS.map((icon) => (
                  <option key={icon} value={icon}>
                    {t(`benefitIcons.${icon}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("benefitItemTitle")}</span>
              <input
                value={item.title}
                onChange={(e) => updateBenefitItem(index, { title: e.target.value })}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("benefitItemText")}</span>
              <textarea
                rows={2}
                value={item.text}
                onChange={(e) => updateBenefitItem(index, { text: e.target.value })}
              />
            </label>
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => removeBenefit(index)}
            >
              {t("benefitRemove")}
            </AdminButton>
          </div>
        ))}
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={addBenefit}
          disabled={copy.benefitItems.length >= MAX_BENEFIT_ITEMS}
        >
          {t("benefitAdd")}
        </AdminButton>

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionSteps")}</span>
            <input
              value={copy.stepsTitle}
              onChange={(e) => patchCopy({ stepsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("stepsLead")}</span>
            <textarea
              rows={2}
              value={copy.stepsLead}
              onChange={(e) => patchCopy({ stepsLead: e.target.value })}
            />
          </label>
        </div>
        {copy.stepItems.map((item, index) => (
          <div key={`step-${index}`} className="admin-settings-fields mt-3">
            <label>
              <span>{t("stepItemTitle")}</span>
              <input
                value={item.title}
                onChange={(e) => updateStepItem(index, { title: e.target.value })}
              />
            </label>
            <label>
              <span>{t("stepItemText")}</span>
              <textarea
                rows={2}
                value={item.text}
                onChange={(e) => updateStepItem(index, { text: e.target.value })}
              />
            </label>
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => removeStep(index)}
            >
              {t("stepRemove")}
            </AdminButton>
          </div>
        ))}
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={addStep}
          disabled={copy.stepItems.length >= MAX_STEP_ITEMS}
        >
          {t("stepAdd")}
        </AdminButton>

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionCta")}</span>
            <input
              value={copy.ctaTitle}
              onChange={(e) => patchCopy({ ctaTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("ctaLead")}</span>
            <textarea
              rows={2}
              value={copy.ctaLead}
              onChange={(e) => patchCopy({ ctaLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("ctaLabel")}</span>
            <input
              value={copy.ctaLabel}
              onChange={(e) => patchCopy({ ctaLabel: e.target.value })}
            />
          </label>
          <label>
            <span>{t("ctaHref")}</span>
            <input
              value={draft.ctaHref}
              onChange={(e) => patchDraft({ ctaHref: e.target.value })}
            />
          </label>
        </div>
        {copy.textItems.map((item) => (
          <div key={item.id} className="admin-settings-fields mt-4">
            <label className="pub-settings-section-toggle">
              <input
                type="checkbox"
                checked={draft.textVisible[item.id] !== false}
                onChange={(e) =>
                  patchDraft({
                    textVisible: { ...draft.textVisible, [item.id]: e.target.checked },
                  })
                }
              />
              {t("sectionText")}
            </label>
            <label>
              <span>{t("textTitle")}</span>
              <input
                value={item.title}
                onChange={(e) =>
                  patchCopy({
                    textItems: copy.textItems.map((row) =>
                      row.id === item.id ? { ...row, title: e.target.value } : row,
                    ),
                  })
                }
              />
            </label>
            <label>
              <span>{t("textLead")}</span>
              <textarea
                rows={2}
                value={item.lead}
                onChange={(e) =>
                  patchCopy({
                    textItems: copy.textItems.map((row) =>
                      row.id === item.id ? { ...row, lead: e.target.value } : row,
                    ),
                  })
                }
              />
            </label>
            <label>
              <span>{t("textBody")}</span>
              <textarea
                rows={6}
                value={item.body}
                onChange={(e) =>
                  patchCopy({
                    textItems: copy.textItems.map((row) =>
                      row.id === item.id ? { ...row, body: e.target.value } : row,
                    ),
                  })
                }
              />
            </label>
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => removeTextSection(item.id)}
            >
              {t("textRemove")}
            </AdminButton>
          </div>
        ))}
      </FormSection>

      <FormSection title={t("sectionGallery")} description={t("gallerySectionDesc")}>
        <label className="pub-settings-section-toggle mb-4">
          <input
            type="checkbox"
            checked={draft.galleryVisible}
            onChange={(e) => patchDraft({ galleryVisible: e.target.checked })}
          />
          {t("sectionGallery")}
        </label>
        <div className="admin-settings-fields mb-4">
          <label>
            <span>{t("galleryTitleLabel")}</span>
            <input
              value={copy.galleryTitle}
              onChange={(e) => patchCopy({ galleryTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("galleryLeadLabel")}</span>
            <textarea
              rows={2}
              value={copy.galleryLead}
              onChange={(e) => patchCopy({ galleryLead: e.target.value })}
            />
          </label>
        </div>

        <div className="pub-gallery-editor">
          {draft.galleryItems.length === 0 ? (
            <p className="pub-gallery-editor__empty">{t("galleryEmpty")}</p>
          ) : (
            draft.galleryItems.map((item, index) => (
              <div key={item.id} className="pub-gallery-editor__item pub-gallery-editor__item--upload">
                <PublicSiteImageField
                  kind="gallery"
                  label={t("galleryPhotoLabel", { index: index + 1 })}
                  value={item.url}
                  onChange={(url) => updateGalleryUrl(item.id, url)}
                  disabled={readOnly}
                />
                <label>
                  <span>{t("galleryCaptionLabel")}</span>
                  <input
                    value={copy.galleryCaptions[item.id] ?? ""}
                    placeholder={t("galleryCaptionLabel")}
                    aria-label={t("galleryCaptionLabel")}
                    onChange={(e) => updateGalleryCaption(item.id, e.target.value)}
                  />
                </label>
                <div className="pub-gallery-editor__actions">
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    aria-label={t("galleryMoveUp")}
                    disabled={index === 0}
                    onClick={() => moveGalleryItem(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    aria-label={t("galleryMoveDown")}
                    disabled={index === draft.galleryItems.length - 1}
                    onClick={() => moveGalleryItem(item.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn pub-gallery-editor__icon-btn--danger"
                    aria-label={t("galleryRemove")}
                    onClick={() => removeGalleryItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            className="pub-gallery-editor__add"
            onClick={addGalleryItem}
          >
            {t("galleryAddPhoto")}
          </AdminButton>
        </div>
      </FormSection>

      <FormSection title={t("pagesTitle")} description={t("pagesSectionDesc")} defaultOpen={false}>
        <div className="admin-settings-fields">
          <label>
            <span>{t("comingSoonTitle")}</span>
            <input
              value={copy.comingSoonTitle}
              onChange={(e) => patchCopy({ comingSoonTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("comingSoonLead")}</span>
            <textarea
              rows={3}
              value={copy.comingSoonLead}
              onChange={(e) => patchCopy({ comingSoonLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("calendarTitleLabel")}</span>
            <input
              value={copy.calendarTitle}
              onChange={(e) => patchCopy({ calendarTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("calendarLeadLabel")}</span>
            <textarea
              rows={2}
              value={copy.calendarLead}
              onChange={(e) => patchCopy({ calendarLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("termsTitleLabel")}</span>
            <input
              value={copy.termsTitle}
              onChange={(e) => patchCopy({ termsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("termsLeadLabel")}</span>
            <input
              value={copy.termsLead}
              onChange={(e) => patchCopy({ termsLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("termsBodyLabel")}</span>
            <textarea
              rows={8}
              value={copy.termsBody}
              onChange={(e) => patchCopy({ termsBody: e.target.value })}
            />
            <SettingsFieldHint>{t("legalBodyHint")}</SettingsFieldHint>
          </label>
          <label>
            <span>{t("privacyTitleLabel")}</span>
            <input
              value={copy.privacyTitle}
              onChange={(e) => patchCopy({ privacyTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("privacyLeadLabel")}</span>
            <input
              value={copy.privacyLead}
              onChange={(e) => patchCopy({ privacyLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("privacyBodyLabel")}</span>
            <textarea
              rows={8}
              value={copy.privacyBody}
              onChange={(e) => patchCopy({ privacyBody: e.target.value })}
            />
            <SettingsFieldHint>{t("legalBodyHint")}</SettingsFieldHint>
          </label>
        </div>
      </FormSection>

      <FormSection title={t("bookingTitle")} description={t("bookingSectionDescOnly")}>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={draft.bookingEnabled}
              onChange={(e) => patchDraft({ bookingEnabled: e.target.checked })}
            />
            {t("bookingEnabled")}
          </label>
          <label>
            <span>{t("bookingPosition")}</span>
            <select
              value={draft.bookingNavPosition}
              onChange={(e) =>
                patchDraft({
                  bookingNavPosition: e.target
                    .value as PublicSiteSettingsInput["bookingNavPosition"],
                })
              }
            >
              <option value="nav">{t("bookingPosNav")}</option>
              <option value="footer">{t("bookingPosFooter")}</option>
              <option value="both">{t("bookingPosBoth")}</option>
              <option value="hidden">{t("bookingPosHidden")}</option>
            </select>
          </label>
        </div>
        <BookingNoticeEditor
          value={copy.noticeDraft}
          onChange={patchNotice}
          locale={draft.editLocale}
          checkInTime={config.checkInTime}
          checkOutTime={config.checkOutTime}
        />
      </FormSection>
          </fieldset>
        </form>
      }
    />
  );
}

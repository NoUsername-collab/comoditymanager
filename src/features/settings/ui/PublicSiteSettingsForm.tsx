"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PUBLIC_TEMPLATE_OPTIONS,
  PUBLIC_THEME_OPTIONS,
} from "@/features/public-site/domain/defaults";
import { pickLocalized, writeLocalized } from "@/features/public-site/domain/localized";
import {
  PUBLIC_BENEFIT_ICON_IDS,
  normalizeBenefitIcon,
} from "@/features/public-site/domain/benefit-icons";
import {
  bookingNoticeFromDraft,
  bookingNoticeToDraft,
} from "@/features/public-site/domain/booking-notice";
import type {
  PublicBenefitItem,
  PublicGalleryItem,
  PublicSiteConfig,
  PublicSiteSettingsInput,
  PublicStepItem,
} from "@/features/public-site/domain/types";
import { BookingNoticeEditor } from "@/features/settings/ui/BookingNoticeEditor";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { savePublicSiteSettingsAction } from "@/features/settings/actions/public-site";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { PublicSitePreview } from "@/features/settings/ui/PublicSitePreview";
import { PublicSiteStudio } from "@/features/settings/ui/PublicSiteStudio";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { SettingsFieldError } from "@/components/admin/settings/SettingsFieldError";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";

type GalleryDraftItem = { id: string; url: string; caption: string };

type CopyLineDraft = { icon: string; title: string; text: string };
type StepLineDraft = { title: string; text: string };

type PublicSiteDraft = {
  templateId: PublicSiteSettingsInput["templateId"];
  themeId: PublicSiteSettingsInput["themeId"];
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicSiteSettingsInput["bookingNavPosition"];
  noticeDraft: ReturnType<typeof bookingNoticeToDraft>;
  usePrimaryContact: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroBadge: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  contactFacebook: string;
  contactInstagram: string;
  galleryItems: GalleryDraftItem[];
  galleryVisible: boolean;
  introVisible: boolean;
  introTitle: string;
  introLead: string;
  benefitsVisible: boolean;
  benefitsTitle: string;
  benefitsLead: string;
  benefitItems: CopyLineDraft[];
  stepsVisible: boolean;
  stepsTitle: string;
  stepsLead: string;
  stepItems: StepLineDraft[];
  ctaVisible: boolean;
  ctaTitle: string;
  ctaLead: string;
  ctaLabel: string;
};

let galleryDraftSeq = 0;
function nextGalleryDraftId(): string {
  galleryDraftSeq += 1;
  return `gallery-draft-${galleryDraftSeq}`;
}

function galleryItemsToDraft(
  items: PublicGalleryItem[] | undefined,
  locale: string,
): GalleryDraftItem[] {
  return (items ?? []).map((item, index) => ({
    id: item.id || `gallery-${index}`,
    url: item.url,
    caption: pickLocalized(item.caption, locale),
  }));
}

function galleryDraftToItems(
  items: GalleryDraftItem[],
  locale: string,
  previous: PublicGalleryItem[],
): PublicGalleryItem[] {
  return items
    .filter((item) => item.url.trim().length > 0)
    .map((item, index) => {
      const prev = previous.find((row) => row.id === item.id) ?? previous[index];
      return {
        id: item.id || `gallery-${index}`,
        url: item.url.trim(),
        caption: writeLocalized(prev?.caption, locale, item.caption),
      };
    });
}

function buildPublicSiteDraft(
  config: PublicSiteConfig,
  locale: string,
): PublicSiteDraft {
  const gallerySection = config.sections.find(
    (section) => section.sectionType === "gallery",
  );
  const visibility = new Map(
    config.sections.map((section) => [section.sectionType, section.visible]),
  );
  const heroTitle = pickLocalized(config.hero.title, locale, [config.displayName]);
  const heroSubtitle = pickLocalized(config.hero.subtitle, locale);
  const introSection = config.sections.find((section) => section.sectionType === "intro");
  const benefitsSection = config.sections.find((section) => section.sectionType === "benefits");
  const stepsSection = config.sections.find((section) => section.sectionType === "steps");
  const ctaSection = config.sections.find((section) => section.sectionType === "cta");
  const benefitItems = ((benefitsSection?.payload.items ?? []) as PublicBenefitItem[]).map(
    (item) => ({
      icon: normalizeBenefitIcon(item.icon),
      title: pickLocalized(item.title, locale),
      text: pickLocalized(item.text, locale),
    }),
  );
  const stepItems = ((stepsSection?.payload.items ?? []) as PublicStepItem[]).map((item) => ({
    title: pickLocalized(item.title, locale),
    text: pickLocalized(item.text, locale),
  }));
  return {
    templateId: config.templateId,
    themeId: config.themeId,
    published: config.published,
    bookingEnabled: config.bookingEnabled,
    bookingNavPosition: config.bookingNavPosition,
    noticeDraft: bookingNoticeToDraft(config.bookingNotice, locale),
    usePrimaryContact: config.usePrimaryContact ?? true,
    heroTitle,
    heroSubtitle,
    heroTagline: pickLocalized(config.hero.tagline, locale),
    heroBadge: pickLocalized(config.hero.badge, locale),
    heroCtaPrimary: pickLocalized(config.hero.ctaPrimary, locale),
    heroCtaSecondary: pickLocalized(config.hero.ctaSecondary, locale),
    heroImageUrl: config.hero.imageUrl ?? "",
    seoTitle: pickLocalized(config.seo.metaTitle, locale, [heroTitle]),
    seoDescription: pickLocalized(config.seo.metaDescription, locale, [
      heroSubtitle,
    ]),
    contactEmail: config.contact.email ?? "",
    contactPhone: config.contact.phone ?? "",
    contactWhatsapp: config.contact.whatsapp ?? "",
    contactTelegram: config.contact.telegram ?? "",
    contactFacebook: config.contact.facebook ?? "",
    contactInstagram: config.contact.instagram ?? "",
    galleryItems: galleryItemsToDraft(
      gallerySection?.payload.items as PublicGalleryItem[] | undefined,
      locale,
    ),
    galleryVisible: gallerySection?.visible ?? false,
    introVisible: visibility.get("intro") ?? true,
    introTitle: pickLocalized(introSection?.payload.title, locale),
    introLead: pickLocalized(introSection?.payload.lead, locale),
    benefitsVisible: visibility.get("benefits") ?? true,
    benefitsTitle: pickLocalized(benefitsSection?.payload.title, locale),
    benefitsLead: pickLocalized(benefitsSection?.payload.lead, locale),
    benefitItems:
      benefitItems.length > 0
        ? benefitItems
        : [
            { icon: "bed", title: "", text: "" },
            { icon: "spark", title: "", text: "" },
            { icon: "handshake", title: "", text: "" },
          ],
    stepsVisible: visibility.get("steps") ?? true,
    stepsTitle: pickLocalized(stepsSection?.payload.title, locale),
    stepsLead: pickLocalized(stepsSection?.payload.lead, locale),
    stepItems:
      stepItems.length > 0
        ? stepItems
        : [
            { title: "", text: "" },
            { title: "", text: "" },
            { title: "", text: "" },
          ],
    ctaVisible: visibility.get("cta") ?? true,
    ctaTitle: pickLocalized(ctaSection?.payload.title, locale),
    ctaLead: pickLocalized(ctaSection?.payload.lead, locale),
    ctaLabel: pickLocalized(ctaSection?.payload.ctaLabel, locale),
  };
}

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
}: {
  config: PublicSiteConfig;
  locale: string;
  primaryContact: PensionContact;
  readOnly?: boolean;
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

  const [draft, setDraft] = useState<PublicSiteDraft>(() =>
    buildPublicSiteDraft(config, locale),
  );

  function patchDraft(partial: Partial<PublicSiteDraft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function addGalleryItem() {
    setDraft((d) => ({
      ...d,
      galleryItems: [
        ...d.galleryItems,
        { id: nextGalleryDraftId(), url: "", caption: "" },
      ],
    }));
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

  function updateGalleryItem(id: string, patch: Partial<GalleryDraftItem>) {
    setDraft((d) => ({
      ...d,
      galleryItems: d.galleryItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateBenefitItem(index: number, patch: Partial<CopyLineDraft>) {
    setDraft((d) => ({
      ...d,
      benefitItems: d.benefitItems.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function updateStepItem(index: number, patch: Partial<StepLineDraft>) {
    setDraft((d) => ({
      ...d,
      stepItems: d.stepItems.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  const draftInput = useMemo(
    () => buildInputFromState({ config, draft, locale }),
    [config, draft, locale],
  );

  const previewConfig = useMemo(
    () => buildPublicSiteConfigFromInput(config, draftInput, primaryContact),
    [config, draftInput, primaryContact],
  );

  const initialSnapshot = useRef(JSON.stringify(draftInput));
  const dirty = JSON.stringify(draftInput) !== initialSnapshot.current;
  useSettingsUnsavedWarning(!readOnly && dirty);

  function buildInput(): PublicSiteSettingsInput {
    return draftInput;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await savePublicSiteSettingsAction(buildInput());
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      } else {
        router.push(result.redirectTo);
      }
    });
  }

  return (
    <PublicSiteStudio
      published={draft.published}
      preview={<PublicSitePreview config={previewConfig} locale={locale} />}
      form={
        <form onSubmit={handleSubmit} className="settings-form-stack">
          <fieldset disabled={readOnly} className="settings-form-stack border-0 p-0 m-0 min-w-0">
            {!readOnly && dirty ? (
              <p className="settings-unsaved-banner" role="status">
                {tSettings("unsavedChanges")}
              </p>
            ) : null}
            <SettingsFieldHint className="mb-3 block">
              {t("localeEditHint", { locale: locale.toUpperCase() })}
            </SettingsFieldHint>
            {error ? (
              <div className="settings-alerts">
                <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                  {error}
                </p>
              </div>
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
              onClick={() => patchDraft({ templateId: option })}
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
              value={draft.heroTitle}
              aria-invalid={!!fieldError("hero.title")}
              onChange={(e) => patchDraft({ heroTitle: e.target.value })}
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
              value={draft.heroBadge}
              onChange={(e) => patchDraft({ heroBadge: e.target.value })}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroSubtitle")}</span>
            <textarea
              rows={2}
              value={draft.heroSubtitle}
              onChange={(e) => patchDraft({ heroSubtitle: e.target.value })}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroTagline")}</span>
            <textarea
              rows={2}
              value={draft.heroTagline}
              onChange={(e) => patchDraft({ heroTagline: e.target.value })}
            />
          </label>
          <label>
            <span>{t("heroCtaPrimary")}</span>
            <input
              value={draft.heroCtaPrimary}
              onChange={(e) => patchDraft({ heroCtaPrimary: e.target.value })}
            />
          </label>
          <label>
            <span>{t("heroCtaSecondary")}</span>
            <input
              value={draft.heroCtaSecondary}
              onChange={(e) => patchDraft({ heroCtaSecondary: e.target.value })}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroImageUrl")}</span>
            <input
              value={draft.heroImageUrl}
              aria-invalid={!!fieldError("hero.imageUrl")}
              onChange={(e) => patchDraft({ heroImageUrl: e.target.value })}
              placeholder="https://..."
            />
            {fieldError("hero.imageUrl") ? (
              <SettingsFieldError>{fieldError("hero.imageUrl")}</SettingsFieldError>
            ) : (
              <SettingsFieldHint>{t("heroImageHint")}</SettingsFieldHint>
            )}
          </label>
        </div>
      </FormSection>

      <FormSection title={t("seoTitle")} description={t("seoSectionDesc")}>
        <div className="admin-settings-fields">
          <label>
            <span>{t("seoMetaTitle")}</span>
            <input
              value={draft.seoTitle}
              onChange={(e) => patchDraft({ seoTitle: e.target.value })}
            />
            <SettingsFieldHint>{t("seoMetaTitleHint")}</SettingsFieldHint>
          </label>
          <label>
            <span>{t("seoMetaDescription")}</span>
            <textarea
              rows={3}
              value={draft.seoDescription}
              onChange={(e) => patchDraft({ seoDescription: e.target.value })}
            />
            <SettingsFieldHint>{t("seoMetaDescriptionHint")}</SettingsFieldHint>
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
      </FormSection>

      <FormSection title={t("pageCopyTitle")} description={t("pageCopyDesc")} defaultOpen={false}>
        <div className="admin-settings-fields">
          <label>
            <span>{t("sectionIntro")}</span>
            <input
              value={draft.introTitle}
              onChange={(e) => patchDraft({ introTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("introLead")}</span>
            <textarea
              rows={3}
              value={draft.introLead}
              onChange={(e) => patchDraft({ introLead: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionBenefits")}</span>
            <input
              value={draft.benefitsTitle}
              onChange={(e) => patchDraft({ benefitsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("benefitsLead")}</span>
            <textarea
              rows={2}
              value={draft.benefitsLead}
              onChange={(e) => patchDraft({ benefitsLead: e.target.value })}
            />
          </label>
        </div>
        {draft.benefitItems.map((item, index) => (
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
          </div>
        ))}

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionSteps")}</span>
            <input
              value={draft.stepsTitle}
              onChange={(e) => patchDraft({ stepsTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("stepsLead")}</span>
            <textarea
              rows={2}
              value={draft.stepsLead}
              onChange={(e) => patchDraft({ stepsLead: e.target.value })}
            />
          </label>
        </div>
        {draft.stepItems.map((item, index) => (
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
          </div>
        ))}

        <div className="admin-settings-fields mt-4">
          <label>
            <span>{t("sectionCta")}</span>
            <input
              value={draft.ctaTitle}
              onChange={(e) => patchDraft({ ctaTitle: e.target.value })}
            />
          </label>
          <label>
            <span>{t("ctaLead")}</span>
            <textarea
              rows={2}
              value={draft.ctaLead}
              onChange={(e) => patchDraft({ ctaLead: e.target.value })}
            />
          </label>
          <label>
            <span>{t("ctaLabel")}</span>
            <input
              value={draft.ctaLabel}
              onChange={(e) => patchDraft({ ctaLabel: e.target.value })}
            />
          </label>
        </div>
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

        <div className="pub-gallery-editor">
          {draft.galleryItems.length === 0 ? (
            <p className="pub-gallery-editor__empty">{t("galleryEmpty")}</p>
          ) : (
            draft.galleryItems.map((item, index) => (
              <div key={item.id} className="pub-gallery-editor__item">
                {item.url.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="pub-gallery-editor__thumb" />
                ) : (
                  <div className="pub-gallery-editor__thumb" aria-hidden="true" />
                )}
                <div className="pub-gallery-editor__fields">
                  <input
                    value={item.url}
                    placeholder={t("galleryUrlLabel")}
                    aria-label={t("galleryUrlLabel")}
                    onChange={(e) => updateGalleryItem(item.id, { url: e.target.value })}
                  />
                  <input
                    value={item.caption}
                    placeholder={t("galleryCaptionLabel")}
                    aria-label={t("galleryCaptionLabel")}
                    onChange={(e) =>
                      updateGalleryItem(item.id, { caption: e.target.value })
                    }
                  />
                </div>
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
          value={draft.noticeDraft}
          onChange={(noticeDraft) => patchDraft({ noticeDraft })}
          checkInTime={config.checkInTime}
          checkOutTime={config.checkOutTime}
        />
      </FormSection>

      {!readOnly ? (
        <SettingsSaveBar status={pending ? "saving" : "idle"}>
          <AdminSubmitButton type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </AdminSubmitButton>
        </SettingsSaveBar>
      ) : null}
          </fieldset>
        </form>
      }
    />
  );
}

function buildInputFromState(args: {
  config: PublicSiteConfig;
  draft: PublicSiteDraft;
  locale: string;
}): PublicSiteSettingsInput {
  const { config, draft, locale } = args;
  const write = (previous: Parameters<typeof writeLocalized>[0], value: string) =>
    writeLocalized(previous, locale, value);

  const galleryFromConfig = config.sections.find((s) => s.sectionType === "gallery");
  const galleryItems = galleryDraftToItems(
    draft.galleryItems,
    locale,
    (galleryFromConfig?.payload.items ?? []) as PublicGalleryItem[],
  );
  const baseSections = config.sections.filter((section) => section.sectionType !== "gallery");

  const sections = [
    ...baseSections.map((section) => {
      if (section.sectionType === "intro") {
        return {
          ...section,
          visible: draft.introVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, draft.introTitle),
            lead: write(section.payload.lead, draft.introLead),
          },
        };
      }
      if (section.sectionType === "benefits") {
        const previous = (section.payload.items ?? []) as PublicBenefitItem[];
        return {
          ...section,
          visible: draft.benefitsVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, draft.benefitsTitle),
            lead: write(section.payload.lead, draft.benefitsLead),
            items: draft.benefitItems
              .filter((item) => item.title.trim() || item.text.trim())
              .map((item, index) => ({
                icon: normalizeBenefitIcon(item.icon),
                title: write(previous[index]?.title, item.title),
                text: write(previous[index]?.text, item.text),
              })),
          },
        };
      }
      if (section.sectionType === "steps") {
        const previous = (section.payload.items ?? []) as PublicStepItem[];
        return {
          ...section,
          visible: draft.stepsVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, draft.stepsTitle),
            lead: write(section.payload.lead, draft.stepsLead),
            items: draft.stepItems
              .filter((item) => item.title.trim() || item.text.trim())
              .map((item, index) => ({
                title: write(previous[index]?.title, item.title),
                text: write(previous[index]?.text, item.text),
              })),
          },
        };
      }
      if (section.sectionType === "cta") {
        return {
          ...section,
          visible: draft.ctaVisible,
          payload: {
            ...section.payload,
            title: write(section.payload.title, draft.ctaTitle),
            lead: write(section.payload.lead, draft.ctaLead),
            ctaLabel: write(section.payload.ctaLabel, draft.ctaLabel),
            ctaHref: section.payload.ctaHref ?? "/calendar",
          },
        };
      }
      return section;
    }),
    {
      id: galleryFromConfig?.id ?? "gallery",
      sectionType: "gallery" as const,
      sortOrder: galleryFromConfig?.sortOrder ?? 30,
      visible: draft.galleryVisible && galleryItems.length > 0,
      payload: {
        title: galleryFromConfig?.payload.title ?? {},
        lead: galleryFromConfig?.payload.lead ?? {},
        items: galleryItems,
      },
    },
  ].map(({ id: _id, ...section }) => section);

  return {
    templateId: draft.templateId,
    themeId: draft.themeId,
    published: draft.published,
    bookingEnabled: draft.bookingEnabled,
    bookingNavPosition: draft.bookingNavPosition,
    usePrimaryContact: draft.usePrimaryContact,
    hero: {
      ...config.hero,
      badge: write(config.hero.badge, draft.heroBadge),
      title: write(config.hero.title, draft.heroTitle),
      subtitle: write(config.hero.subtitle, draft.heroSubtitle),
      tagline: write(config.hero.tagline, draft.heroTagline),
      ctaPrimary: write(config.hero.ctaPrimary, draft.heroCtaPrimary),
      ctaSecondary: write(config.hero.ctaSecondary, draft.heroCtaSecondary),
      ctaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
      ctaSecondaryHref: config.hero.ctaSecondaryHref ?? "#public-intro",
      imageUrl: draft.heroImageUrl.trim() || null,
      showCheckTimes: config.hero.showCheckTimes ?? true,
    },
    contact: {
      email: draft.contactEmail.trim() || null,
      phone: draft.contactPhone.trim() || null,
      whatsapp: draft.contactWhatsapp.trim() || null,
      telegram: draft.contactTelegram.trim() || null,
      facebook: draft.contactFacebook.trim() || null,
      instagram: draft.contactInstagram.trim() || null,
    },
    seo: {
      metaTitle: write(config.seo.metaTitle, draft.seoTitle || draft.heroTitle),
      metaDescription: write(
        config.seo.metaDescription,
        draft.seoDescription || draft.heroSubtitle,
      ),
    },
    bookingNotice: bookingNoticeFromDraft(draft.noticeDraft),
    sections,
  };
}

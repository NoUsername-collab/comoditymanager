"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PUBLIC_TEMPLATE_OPTIONS,
  PUBLIC_THEME_OPTIONS,
} from "@/features/public-site/domain/defaults";
import { pickLocalized } from "@/features/public-site/domain/localized";
import type {
  PublicGalleryItem,
  PublicSiteConfig,
  PublicSiteSettingsInput,
} from "@/features/public-site/domain/types";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { savePublicSiteSettingsAction } from "@/features/settings/actions/public-site";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { PublicSitePreview } from "@/features/settings/ui/PublicSitePreview";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { SettingsFieldError } from "@/components/admin/settings/SettingsFieldError";
import { SettingsPreviewLayout } from "@/components/admin/settings/SettingsPreviewLayout";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";

type GalleryDraftItem = { id: string; url: string; caption: string };

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

function galleryDraftToItems(items: GalleryDraftItem[]): PublicGalleryItem[] {
  return items
    .filter((item) => item.url.trim().length > 0)
    .map((item, index) => {
      const caption = item.caption.trim();
      return {
        id: item.id || `gallery-${index}`,
        url: item.url.trim(),
        caption: caption ? { ro: caption, en: caption, bg: caption } : undefined,
      };
    });
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

  const [templateId, setTemplateId] = useState(config.templateId);
  const [themeId, setThemeId] = useState(config.themeId);
  const [published, setPublished] = useState(config.published);
  const [bookingEnabled, setBookingEnabled] = useState(config.bookingEnabled);
  const [bookingNavPosition, setBookingNavPosition] = useState(
    config.bookingNavPosition
  );
  const [usePrimaryContact, setUsePrimaryContact] = useState(
    config.usePrimaryContact ?? true
  );

  const [heroTitle, setHeroTitle] = useState(
    pickLocalized(config.hero.title, locale, [config.displayName])
  );
  const [heroSubtitle, setHeroSubtitle] = useState(
    pickLocalized(config.hero.subtitle, locale)
  );
  const [heroTagline, setHeroTagline] = useState(
    pickLocalized(config.hero.tagline, locale)
  );
  const [heroBadge, setHeroBadge] = useState(pickLocalized(config.hero.badge, locale));
  const [heroCtaPrimary, setHeroCtaPrimary] = useState(
    pickLocalized(config.hero.ctaPrimary, locale)
  );
  const [heroCtaSecondary, setHeroCtaSecondary] = useState(
    pickLocalized(config.hero.ctaSecondary, locale)
  );
  const [heroImageUrl, setHeroImageUrl] = useState(config.hero.imageUrl ?? "");
  const [seoTitle, setSeoTitle] = useState(
    pickLocalized(config.seo.metaTitle, locale, [
      pickLocalized(config.hero.title, locale, [config.displayName]),
    ]),
  );
  const [seoDescription, setSeoDescription] = useState(
    pickLocalized(config.seo.metaDescription, locale, [
      pickLocalized(config.hero.subtitle, locale),
    ]),
  );

  const [contactEmail, setContactEmail] = useState(config.contact.email ?? "");
  const [contactPhone, setContactPhone] = useState(config.contact.phone ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(
    config.contact.whatsapp ?? ""
  );
  const [contactTelegram, setContactTelegram] = useState(
    config.contact.telegram ?? ""
  );
  const [contactFacebook, setContactFacebook] = useState(
    config.contact.facebook ?? ""
  );
  const [contactInstagram, setContactInstagram] = useState(
    config.contact.instagram ?? ""
  );

  const gallerySection = useMemo(
    () => config.sections.find((section) => section.sectionType === "gallery"),
    [config.sections]
  );
  const [galleryItems, setGalleryItems] = useState<GalleryDraftItem[]>(() =>
    galleryItemsToDraft(
      gallerySection?.payload.items as PublicGalleryItem[] | undefined,
      locale,
    ),
  );
  const [galleryVisible, setGalleryVisible] = useState(
    gallerySection?.visible ?? false
  );

  function addGalleryItem() {
    setGalleryItems((items) => [
      ...items,
      { id: nextGalleryDraftId(), url: "", caption: "" },
    ]);
  }

  function removeGalleryItem(id: string) {
    setGalleryItems((items) => items.filter((item) => item.id !== id));
  }

  function moveGalleryItem(id: string, direction: -1 | 1) {
    setGalleryItems((items) => {
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= items.length) return items;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved!);
      return next;
    });
  }

  function updateGalleryItem(id: string, patch: Partial<GalleryDraftItem>) {
    setGalleryItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  const sectionVisibility = useMemo(() => {
    const map = new Map(config.sections.map((s) => [s.sectionType, s.visible]));
    return {
      intro: map.get("intro") ?? true,
      benefits: map.get("benefits") ?? true,
      steps: map.get("steps") ?? true,
      cta: map.get("cta") ?? true,
    };
  }, [config.sections]);

  const [introVisible, setIntroVisible] = useState(sectionVisibility.intro);
  const [benefitsVisible, setBenefitsVisible] = useState(sectionVisibility.benefits);
  const [stepsVisible, setStepsVisible] = useState(sectionVisibility.steps);
  const [ctaVisible, setCtaVisible] = useState(sectionVisibility.cta);

  const draftInput = useMemo(
    () =>
      buildInputFromState({
        config,
        templateId,
        themeId,
        published,
        bookingEnabled,
        bookingNavPosition,
        usePrimaryContact,
        heroTitle,
        heroSubtitle,
        heroTagline,
        heroBadge,
        heroCtaPrimary,
        heroCtaSecondary,
        heroImageUrl,
        seoTitle,
        seoDescription,
        contactEmail,
        contactPhone,
        contactWhatsapp,
        contactTelegram,
        contactFacebook,
        contactInstagram,
        galleryItems,
        galleryVisible,
        introVisible,
        benefitsVisible,
        stepsVisible,
        ctaVisible,
      }),
    [
      config,
      templateId,
      themeId,
      published,
      bookingEnabled,
      bookingNavPosition,
      usePrimaryContact,
      heroTitle,
      heroSubtitle,
      heroTagline,
      heroBadge,
      heroCtaPrimary,
      heroCtaSecondary,
      heroImageUrl,
      seoTitle,
      seoDescription,
      contactEmail,
      contactPhone,
      contactWhatsapp,
      contactTelegram,
      contactFacebook,
      contactInstagram,
      galleryItems,
      galleryVisible,
      introVisible,
      benefitsVisible,
      stepsVisible,
      ctaVisible,
    ],
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
    <SettingsPreviewLayout
      preview={<PublicSitePreview config={previewConfig} locale={locale} />}
      form={
        <form onSubmit={handleSubmit} className="settings-form-stack">
          <fieldset disabled={readOnly} className="settings-form-stack border-0 p-0 m-0 min-w-0">
            {!readOnly && dirty ? (
              <p className="settings-unsaved-banner" role="status">
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

      <FormSection title={t("publishTitle")} description={t("publishedHint")}>
        <label className="pub-settings-section-toggle">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
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
              aria-checked={templateId === option}
              className={[
                "pub-settings-card",
                templateId === option && "pub-settings-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTemplateId(option)}
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
              aria-checked={themeId === option}
              className={[
                "pub-settings-card",
                themeId === option && "pub-settings-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setThemeId(option)}
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
              value={heroTitle}
              aria-invalid={!!fieldError("hero.title")}
              onChange={(e) => setHeroTitle(e.target.value)}
            />
            {fieldError("hero.title") ? (
              <SettingsFieldError>{fieldError("hero.title")}</SettingsFieldError>
            ) : (
              <SettingsFieldHint>{t("heroTitleHint")}</SettingsFieldHint>
            )}
          </label>
          <label>
            <span>{t("heroBadge")}</span>
            <input value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroSubtitle")}</span>
            <textarea
              rows={2}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroTagline")}</span>
            <textarea
              rows={2}
              value={heroTagline}
              onChange={(e) => setHeroTagline(e.target.value)}
            />
          </label>
          <label>
            <span>{t("heroCtaPrimary")}</span>
            <input
              value={heroCtaPrimary}
              onChange={(e) => setHeroCtaPrimary(e.target.value)}
            />
          </label>
          <label>
            <span>{t("heroCtaSecondary")}</span>
            <input
              value={heroCtaSecondary}
              onChange={(e) => setHeroCtaSecondary(e.target.value)}
            />
          </label>
          <label className="admin-settings-fields__full">
            <span>{t("heroImageUrl")}</span>
            <input
              value={heroImageUrl}
              aria-invalid={!!fieldError("hero.imageUrl")}
              onChange={(e) => setHeroImageUrl(e.target.value)}
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
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            <SettingsFieldHint>{t("seoMetaTitleHint")}</SettingsFieldHint>
          </label>
          <label>
            <span>{t("seoMetaDescription")}</span>
            <textarea
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
            <SettingsFieldHint>{t("seoMetaDescriptionHint")}</SettingsFieldHint>
          </label>
        </div>
      </FormSection>

      <FormSection title={t("contactTitle")} description={t("contactSectionDesc")}>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={usePrimaryContact}
            onChange={(e) => setUsePrimaryContact(e.target.checked)}
          />
          <span>{t("usePrimaryContact")}</span>
        </label>
        <SettingsFieldHint className="mb-3 block">{t("usePrimaryContactHint")}</SettingsFieldHint>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={contactEmail}
              aria-invalid={!!fieldError("contact.email")}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            {fieldError("contact.email") ? (
              <SettingsFieldError>{fieldError("contact.email")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>{t("phone")}</span>
            <input
              value={contactPhone}
              aria-invalid={!!fieldError("contact.phone")}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            {fieldError("contact.phone") ? (
              <SettingsFieldError>{fieldError("contact.phone")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>WhatsApp</span>
            <input
              value={contactWhatsapp}
              aria-invalid={!!fieldError("contact.whatsapp")}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="+40..."
            />
            {fieldError("contact.whatsapp") ? (
              <SettingsFieldError>{fieldError("contact.whatsapp")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Telegram</span>
            <input
              value={contactTelegram}
              aria-invalid={!!fieldError("contact.telegram")}
              onChange={(e) => setContactTelegram(e.target.value)}
              placeholder="@username"
            />
            {fieldError("contact.telegram") ? (
              <SettingsFieldError>{fieldError("contact.telegram")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Facebook</span>
            <input
              value={contactFacebook}
              aria-invalid={!!fieldError("contact.facebook")}
              onChange={(e) => setContactFacebook(e.target.value)}
            />
            {fieldError("contact.facebook") ? (
              <SettingsFieldError>{fieldError("contact.facebook")}</SettingsFieldError>
            ) : null}
          </label>
          <label>
            <span>Instagram</span>
            <input
              value={contactInstagram}
              aria-invalid={!!fieldError("contact.instagram")}
              onChange={(e) => setContactInstagram(e.target.value)}
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
              checked={introVisible}
              onChange={(e) => setIntroVisible(e.target.checked)}
            />
            {t("sectionIntro")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={benefitsVisible}
              onChange={(e) => setBenefitsVisible(e.target.checked)}
            />
            {t("sectionBenefits")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={stepsVisible}
              onChange={(e) => setStepsVisible(e.target.checked)}
            />
            {t("sectionSteps")}
          </label>
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={ctaVisible}
              onChange={(e) => setCtaVisible(e.target.checked)}
            />
            {t("sectionCta")}
          </label>
        </div>
      </FormSection>

      <FormSection title={t("sectionGallery")} description={t("gallerySectionDesc")}>
        <label className="pub-settings-section-toggle mb-4">
          <input
            type="checkbox"
            checked={galleryVisible}
            onChange={(e) => setGalleryVisible(e.target.checked)}
          />
          {t("sectionGallery")}
        </label>

        <div className="pub-gallery-editor">
          {galleryItems.length === 0 ? (
            <p className="pub-gallery-editor__empty">{t("galleryEmpty")}</p>
          ) : (
            galleryItems.map((item, index) => (
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
                    disabled={index === galleryItems.length - 1}
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
              checked={bookingEnabled}
              onChange={(e) => setBookingEnabled(e.target.checked)}
            />
            {t("bookingEnabled")}
          </label>
          <label>
            <span>{t("bookingPosition")}</span>
            <select
              value={bookingNavPosition}
              onChange={(e) =>
                setBookingNavPosition(
                  e.target.value as PublicSiteSettingsInput["bookingNavPosition"]
                )
              }
            >
              <option value="nav">{t("bookingPosNav")}</option>
              <option value="footer">{t("bookingPosFooter")}</option>
              <option value="both">{t("bookingPosBoth")}</option>
              <option value="hidden">{t("bookingPosHidden")}</option>
            </select>
          </label>
        </div>
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
  templateId: PublicSiteSettingsInput["templateId"];
  themeId: PublicSiteSettingsInput["themeId"];
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicSiteSettingsInput["bookingNavPosition"];
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
  benefitsVisible: boolean;
  stepsVisible: boolean;
  ctaVisible: boolean;
}): PublicSiteSettingsInput {
  const localized = (value: string) => ({ ro: value, en: value, bg: value });
  const { config } = args;

  const baseSections = config.sections.filter((section) => section.sectionType !== "gallery");
  const galleryItems = galleryDraftToItems(args.galleryItems);
  const galleryFromConfig = config.sections.find((s) => s.sectionType === "gallery");

  const sections = [
    ...baseSections.map((section) => {
      if (section.sectionType === "intro") {
        return { ...section, visible: args.introVisible };
      }
      if (section.sectionType === "benefits") {
        return { ...section, visible: args.benefitsVisible };
      }
      if (section.sectionType === "steps") {
        return { ...section, visible: args.stepsVisible };
      }
      if (section.sectionType === "cta") {
        return { ...section, visible: args.ctaVisible };
      }
      return section;
    }),
    {
      id: galleryFromConfig?.id ?? "gallery",
      sectionType: "gallery" as const,
      sortOrder: galleryFromConfig?.sortOrder ?? 30,
      visible: args.galleryVisible && galleryItems.length > 0,
      payload: {
        title: galleryFromConfig?.payload.title ?? localized("Galerie"),
        lead: galleryFromConfig?.payload.lead ?? localized(""),
        items: galleryItems,
      },
    },
  ].map(({ id: _id, ...section }) => section);

  return {
    templateId: args.templateId,
    themeId: args.themeId,
    published: args.published,
    bookingEnabled: args.bookingEnabled,
    bookingNavPosition: args.bookingNavPosition,
    usePrimaryContact: args.usePrimaryContact,
    hero: {
      ...config.hero,
      badge: localized(args.heroBadge),
      title: localized(args.heroTitle),
      subtitle: localized(args.heroSubtitle),
      tagline: localized(args.heroTagline),
      ctaPrimary: localized(args.heroCtaPrimary),
      ctaSecondary: localized(args.heroCtaSecondary),
      ctaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
      ctaSecondaryHref: config.hero.ctaSecondaryHref ?? "#public-intro",
      imageUrl: args.heroImageUrl.trim() || null,
      showCheckTimes: config.hero.showCheckTimes ?? true,
    },
    contact: {
      email: args.contactEmail.trim() || null,
      phone: args.contactPhone.trim() || null,
      whatsapp: args.contactWhatsapp.trim() || null,
      telegram: args.contactTelegram.trim() || null,
      facebook: args.contactFacebook.trim() || null,
      instagram: args.contactInstagram.trim() || null,
    },
    seo: {
      metaTitle: localized(args.seoTitle || args.heroTitle),
      metaDescription: localized(args.seoDescription || args.heroSubtitle),
    },
    sections,
  };
}

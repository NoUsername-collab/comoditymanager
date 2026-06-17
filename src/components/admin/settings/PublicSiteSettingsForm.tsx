"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
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
import { savePublicSiteSettingsAction } from "@/app/[locale]/admin/(panel)/settings/public-site/actions";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";

function galleryToText(items: PublicGalleryItem[] | undefined): string {
  return (items ?? [])
    .map((item) => {
      const caption = item.caption?.ro ?? item.caption?.en ?? "";
      return caption ? `${item.url} | ${caption}` : item.url;
    })
    .join("\n");
}

function textToGallery(raw: string): PublicGalleryItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [url, caption] = line.split("|").map((part) => part.trim());
      return {
        id: `gallery-${index}`,
        url: url ?? line,
        caption: caption ? { ro: caption, en: caption, bg: caption } : undefined,
      };
    });
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-section">
      <header className="settings-section__head">
        <div>
          <h2 className="settings-section__title">{title}</h2>
          {description ? <p className="settings-section__desc">{description}</p> : null}
        </div>
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

export function PublicSiteSettingsForm({
  config,
  locale,
}: {
  config: PublicSiteConfig;
  locale: string;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState(config.templateId);
  const [themeId, setThemeId] = useState(config.themeId);
  const [published, setPublished] = useState(config.published);
  const [bookingEnabled, setBookingEnabled] = useState(config.bookingEnabled);
  const [bookingNavPosition, setBookingNavPosition] = useState(
    config.bookingNavPosition
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
  const [galleryText, setGalleryText] = useState(
    galleryToText(gallerySection?.payload.items as PublicGalleryItem[] | undefined)
  );
  const [galleryVisible, setGalleryVisible] = useState(
    gallerySection?.visible ?? false
  );

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

  function buildInput(): PublicSiteSettingsInput {
    const localized = (value: string) => ({ ro: value, en: value, bg: value });

    const baseSections = config.sections.filter(
      (section) => section.sectionType !== "gallery"
    );

    const galleryItems = textToGallery(galleryText);
    const galleryFromConfig = config.sections.find((s) => s.sectionType === "gallery");

    const sections = [
      ...baseSections.map((section) => {
        if (section.sectionType === "intro") {
          return { ...section, visible: introVisible };
        }
        if (section.sectionType === "benefits") {
          return { ...section, visible: benefitsVisible };
        }
        if (section.sectionType === "steps") {
          return { ...section, visible: stepsVisible };
        }
        if (section.sectionType === "cta") {
          return { ...section, visible: ctaVisible };
        }
        return section;
      }),
      {
        id: galleryFromConfig?.id ?? "gallery",
        sectionType: "gallery" as const,
        sortOrder: galleryFromConfig?.sortOrder ?? 30,
        visible: galleryVisible && galleryItems.length > 0,
        payload: {
          title: galleryFromConfig?.payload.title ?? localized("Galerie"),
          lead: galleryFromConfig?.payload.lead ?? localized(""),
          items: galleryItems,
        },
      },
    ].map(({ id: _id, ...section }) => section);

    return {
      templateId,
      themeId,
      published,
      bookingEnabled,
      bookingNavPosition,
      hero: {
        ...config.hero,
        badge: localized(heroBadge),
        title: localized(heroTitle),
        subtitle: localized(heroSubtitle),
        tagline: localized(heroTagline),
        ctaPrimary: localized(heroCtaPrimary),
        ctaSecondary: localized(heroCtaSecondary),
        ctaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
        ctaSecondaryHref: config.hero.ctaSecondaryHref ?? "#public-intro",
        imageUrl: heroImageUrl.trim() || null,
        showCheckTimes: config.hero.showCheckTimes ?? true,
      },
      contact: {
        email: contactEmail.trim() || null,
        phone: contactPhone.trim() || null,
        whatsapp: contactWhatsapp.trim() || null,
        telegram: contactTelegram.trim() || null,
        facebook: contactFacebook.trim() || null,
        instagram: contactInstagram.trim() || null,
      },
      seo: {
        metaTitle: localized(heroTitle),
        metaDescription: localized(heroSubtitle),
      },
      sections,
    };
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await savePublicSiteSettingsAction(buildInput());
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form-stack">
      {error ? (
        <div className="settings-alerts">
          <p className="settings-alerts__item settings-alerts__item--error" role="alert">
            {error}
          </p>
        </div>
      ) : null}

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
            <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
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
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>
      </FormSection>

      <FormSection title={t("contactTitle")} description={t("contactSectionDesc")}>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <label>
            <span>Email</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </label>
          <label>
            <span>{t("phone")}</span>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <label>
            <span>WhatsApp</span>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="+40..."
            />
          </label>
          <label>
            <span>Telegram</span>
            <input
              value={contactTelegram}
              onChange={(e) => setContactTelegram(e.target.value)}
              placeholder="@username"
            />
          </label>
          <label>
            <span>Facebook</span>
            <input
              value={contactFacebook}
              onChange={(e) => setContactFacebook(e.target.value)}
            />
          </label>
          <label>
            <span>Instagram</span>
            <input
              value={contactInstagram}
              onChange={(e) => setContactInstagram(e.target.value)}
            />
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
          <label className="pub-settings-section-toggle">
            <input
              type="checkbox"
              checked={galleryVisible}
              onChange={(e) => setGalleryVisible(e.target.checked)}
            />
            {t("sectionGallery")}
          </label>
        </div>
        <div className="admin-settings-fields">
          <label>
            <span>{t("galleryHelp")}</span>
            <textarea
              rows={5}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
              placeholder="https://example.com/photo.jpg | Cameră dublă"
            />
          </label>
        </div>
      </FormSection>

      <FormSection title={t("bookingTitle")} description={t("bookingSectionDesc")}>
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
          <label className="pub-settings-section-toggle admin-settings-fields__full">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            {t("published")}
          </label>
        </div>
      </FormSection>

      <div className="settings-form-stack__submit">
        <AdminSubmitButton
          type="submit"
          disabled={pending}
          className="settings-form-stack__btn"
        >
          {pending ? t("saving") : t("save")}
        </AdminSubmitButton>
      </div>
    </form>
  );
}

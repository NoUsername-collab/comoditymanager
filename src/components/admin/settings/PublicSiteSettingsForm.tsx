"use client";

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">{t("templateTitle")}</h3>
        <div className="pub-settings-grid pub-settings-grid--3">
          {PUBLIC_TEMPLATE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={[
                "pub-settings-card",
                templateId === option && "pub-settings-card--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTemplateId(option)}
            >
              <p className="pub-settings-card__title">{t(`templates.${option}.title`)}</p>
              <p className="pub-settings-card__desc">
                {t(`templates.${option}.desc`)}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">{t("themeTitle")}</h3>
        <div className="pub-settings-grid pub-settings-grid--3">
          {PUBLIC_THEME_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
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
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="pub-settings-field">
          <span>{t("heroTitle")}</span>
          <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
        </label>
        <label className="pub-settings-field">
          <span>{t("heroBadge")}</span>
          <input value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} />
        </label>
        <label className="pub-settings-field md:col-span-2">
          <span>{t("heroSubtitle")}</span>
          <textarea
            rows={2}
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
          />
        </label>
        <label className="pub-settings-field md:col-span-2">
          <span>{t("heroTagline")}</span>
          <textarea
            rows={2}
            value={heroTagline}
            onChange={(e) => setHeroTagline(e.target.value)}
          />
        </label>
        <label className="pub-settings-field">
          <span>{t("heroCtaPrimary")}</span>
          <input
            value={heroCtaPrimary}
            onChange={(e) => setHeroCtaPrimary(e.target.value)}
          />
        </label>
        <label className="pub-settings-field">
          <span>{t("heroCtaSecondary")}</span>
          <input
            value={heroCtaSecondary}
            onChange={(e) => setHeroCtaSecondary(e.target.value)}
          />
        </label>
        <label className="pub-settings-field md:col-span-2">
          <span>{t("heroImageUrl")}</span>
          <input
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-sm font-bold text-zinc-900">{t("contactTitle")}</h3>
        <label className="pub-settings-field">
          <span>Email</span>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </label>
        <label className="pub-settings-field">
          <span>{t("phone")}</span>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
        <label className="pub-settings-field">
          <span>WhatsApp</span>
          <input
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="+40..."
          />
        </label>
        <label className="pub-settings-field">
          <span>Telegram</span>
          <input
            value={contactTelegram}
            onChange={(e) => setContactTelegram(e.target.value)}
            placeholder="@username"
          />
        </label>
        <label className="pub-settings-field">
          <span>Facebook</span>
          <input
            value={contactFacebook}
            onChange={(e) => setContactFacebook(e.target.value)}
          />
        </label>
        <label className="pub-settings-field">
          <span>Instagram</span>
          <input
            value={contactInstagram}
            onChange={(e) => setContactInstagram(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-zinc-900">{t("sectionsTitle")}</h3>
        <label className="pub-settings-section-toggle">
          <input type="checkbox" checked={introVisible} onChange={(e) => setIntroVisible(e.target.checked)} />
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
          <input type="checkbox" checked={stepsVisible} onChange={(e) => setStepsVisible(e.target.checked)} />
          {t("sectionSteps")}
        </label>
        <label className="pub-settings-section-toggle">
          <input type="checkbox" checked={ctaVisible} onChange={(e) => setCtaVisible(e.target.checked)} />
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
        <label className="pub-settings-field">
          <span>{t("galleryHelp")}</span>
          <textarea
            rows={5}
            value={galleryText}
            onChange={(e) => setGalleryText(e.target.value)}
            placeholder={"https://example.com/photo.jpg | Cameră dublă"}
          />
        </label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="md:col-span-2 text-sm font-bold text-zinc-900">{t("bookingTitle")}</h3>
        <label className="pub-settings-section-toggle">
          <input
            type="checkbox"
            checked={bookingEnabled}
            onChange={(e) => setBookingEnabled(e.target.checked)}
          />
          {t("bookingEnabled")}
        </label>
        <label className="pub-settings-field">
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
        <label className="pub-settings-section-toggle md:col-span-2">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          {t("published")}
        </label>
      </section>

      <AdminSubmitButton type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </AdminSubmitButton>
    </form>
  );
}

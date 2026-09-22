import { PublicPageShell } from "@/features/public-site/ui/PublicPageShell";
import { PublicLegalCopy, publicLegalEmailNode } from "@/features/public-site/ui/PublicLegalCopy";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale, t] = await Promise.all([
    loadPublicSiteConfig(),
    getLocale(),
    getTranslations("public.privacy"),
  ]);
  const title = pickLocalized(config.pages.seoPrivacyTitle, locale, [
    pickLocalized(config.pages.privacyTitle, locale, [t("title")]),
  ]);
  const description = pickLocalized(config.pages.seoPrivacyDescription, locale, [
    pickLocalized(config.pages.privacyLead, locale, [t("lead")]),
  ]);
  const image = config.pages.ogImageUrl || config.hero.imageUrl || null;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function PrivacyPage() {
  const [t, tShell, locale, config] = await Promise.all([
    getTranslations("public.privacy"),
    getTranslations("public.shell"),
    getLocale(),
    loadPublicSiteConfig(),
  ]);

  const contactEmail = config.contact.email?.trim() || null;
  const customBody = pickLocalized(config.pages.privacyBody, locale);
  const title = pickLocalized(config.pages.privacyTitle, locale, [t("title")]);
  const lead = pickLocalized(config.pages.privacyLead, locale, [t("lead")]);

  const rich = {
    email: () => publicLegalEmailNode(contactEmail) ?? config.displayName,
  };

  return (
    <PublicPageShell
      narrow
      backLabel={tShell("backHome")}
      eyebrow={tShell("legalEyebrow")}
      title={title}
      lead={lead}
    >
      <div className="public-prose">
        {customBody ? (
          <PublicLegalCopy text={customBody} />
        ) : (
          <>
            <p>{t("intro")}</p>
            <h2>{t("collectTitle")}</h2>
            <ul>
              <li>{t("collect1")}</li>
              <li>{t("collect2")}</li>
              <li>{t("collect3")}</li>
            </ul>
            <h2>{t("useTitle")}</h2>
            <p>{t("useBody")}</p>
            <h2>{t("legalTitle")}</h2>
            <p>{t("legalBody")}</p>
            <h2>{t("retentionTitle")}</h2>
            <p>{t("retentionBody")}</p>
            <h2>{t("rightsTitle")}</h2>
            <p>{t.rich("rightsBody", rich)}</p>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}

import { PublicPageShell } from "@/features/public-site/ui/PublicPageShell";
import { PublicLegalCopy } from "@/features/public-site/ui/PublicLegalCopy";
import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);
  const title = storedTitle(
    config.pages.seoPrivacyTitle,
    locale,
    storedTitle(config.pages.privacyTitle, locale, config.displayName),
  );
  const description =
    pickOwnLocalized(config.pages.seoPrivacyDescription, locale) ||
    pickOwnLocalized(config.pages.privacyLead, locale);
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
  const [tShell, locale, config] = await Promise.all([
    getTranslations("public.shell"),
    getLocale(),
    loadPublicSiteConfig(),
  ]);

  const customBody = pickOwnLocalized(config.pages.privacyBody, locale);
  const title = pickOwnLocalized(config.pages.privacyTitle, locale);
  const lead = pickOwnLocalized(config.pages.privacyLead, locale);

  return (
    <PublicPageShell
      narrow
      backLabel={tShell("backHome")}
      eyebrow={tShell("legalEyebrow")}
      title={title}
      lead={lead}
    >
      {customBody ? (
        <div className="public-prose">
          <PublicLegalCopy text={customBody} />
        </div>
      ) : null}
    </PublicPageShell>
  );
}

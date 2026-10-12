import { PublicPageShell } from "@/features/public-site/ui/PublicPageShell";
import { PublicLegalCopy } from "@/features/public-site/ui/PublicLegalCopy";
import { pickOwnLocalized, storedTitle } from "@/features/public-site/domain/localized";
import { buildCancellationPolicyText } from "@/domain/settings/booking-rules";
import { loadPublicSiteConfig, loadTermsPage } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([loadPublicSiteConfig(), getLocale()]);
  const title = storedTitle(
    config.pages.seoTermsTitle,
    locale,
    storedTitle(config.pages.termsTitle, locale, config.displayName),
  );
  const description =
    pickOwnLocalized(config.pages.seoTermsDescription, locale) ||
    pickOwnLocalized(config.pages.termsLead, locale);
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

export default async function TermsPage() {
  const [tShell, locale, bookingRules, config] = await Promise.all([
    getTranslations("public.shell"),
    getLocale(),
    loadTermsPage(),
    loadPublicSiteConfig(),
  ]);

  const policyLocale = locale === "bg" ? "bg" : locale === "en" ? "en" : "ro";
  const cancellationText = bookingRules
    ? buildCancellationPolicyText(bookingRules, policyLocale)
    : "";
  const customBody = pickOwnLocalized(config.pages.termsBody, locale);
  const title = pickOwnLocalized(config.pages.termsTitle, locale);
  const lead = pickOwnLocalized(config.pages.termsLead, locale);

  return (
    <PublicPageShell
      narrow
      backLabel={tShell("backHome")}
      eyebrow={tShell("legalEyebrow")}
      title={title}
      lead={lead}
    >
      {customBody || cancellationText ? (
        <div className="public-prose">
          {customBody ? <PublicLegalCopy text={customBody} /> : <p>{cancellationText}</p>}
        </div>
      ) : null}
    </PublicPageShell>
  );
}

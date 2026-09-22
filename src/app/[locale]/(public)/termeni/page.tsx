import { PublicPageShell } from "@/features/public-site/ui/PublicPageShell";
import { PublicLegalCopy, publicLegalEmailNode } from "@/features/public-site/ui/PublicLegalCopy";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { buildCancellationPolicyText } from "@/domain/settings/booking-rules";
import { loadPublicSiteConfig, loadTermsPage } from "@/features/public-site/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale, t] = await Promise.all([
    loadPublicSiteConfig(),
    getLocale(),
    getTranslations("public.terms"),
  ]);
  const title = pickLocalized(config.pages.seoTermsTitle, locale, [
    pickLocalized(config.pages.termsTitle, locale, [t("title")]),
  ]);
  const description = pickLocalized(config.pages.seoTermsDescription, locale, [
    pickLocalized(config.pages.termsLead, locale, [t("lead")]),
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

export default async function TermsPage() {
  const [t, tShell, locale, bookingRules, config] = await Promise.all([
    getTranslations("public.terms"),
    getTranslations("public.shell"),
    getLocale(),
    loadTermsPage(),
    loadPublicSiteConfig(),
  ]);

  const policyLocale = locale === "bg" ? "bg" : locale === "en" ? "en" : "ro";
  const cancellationText = bookingRules
    ? buildCancellationPolicyText(bookingRules, policyLocale)
    : t("s3Body");
  const contactEmail = config.contact.email?.trim() || null;
  const customBody = pickLocalized(config.pages.termsBody, locale);
  const title = pickLocalized(config.pages.termsTitle, locale, [t("title")]);
  const lead = pickLocalized(config.pages.termsLead, locale, [t("lead")]);

  const rich = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    name: config.displayName,
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
            <h2>{t("s1Title")}</h2>
            <p>{t.rich("s1Body", rich)}</p>
            <h2>{t("s2Title")}</h2>
            <p>{t("s2Body")}</p>
            <h2>{t("s3Title")}</h2>
            <p>{cancellationText}</p>
            <h2>{t("s4Title")}</h2>
            <p>{t.rich("s4Body", rich)}</p>
          </>
        )}
      </div>
    </PublicPageShell>
  );
}

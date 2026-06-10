import type { Metadata } from "next";
import { PublicStaffPreviewLazy } from "@/components/public/PublicStaffPreviewLazy";
import { pickLocalized } from "@/features/public-site/domain/localized";
import { PublicSitePage } from "@/features/public-site/templates/PublicSiteTemplates";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadStaffPublicPreview } from "@/services/admin-dashboard";
import { getPublicSiteConfig } from "@/services/public-site/queries";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const [config, locale] = await Promise.all([getPublicSiteConfig(), getLocale()]);

  return {
    title: pickLocalized(config.seo.metaTitle, locale, [config.displayName]),
    description: pickLocalized(config.seo.metaDescription, locale),
  };
}

export default async function HomePage() {
  const staffUserPromise = getAdminUser().catch(() => null);
  const [config, locale, staffUser, staffPreview] = await Promise.all([
    getPublicSiteConfig(),
    getLocale(),
    staffUserPromise,
    staffUserPromise.then((user) =>
      user ? loadStaffPublicPreview().catch(() => null) : null
    ),
  ]);

  return (
    <>
      <PublicSitePage config={config} locale={locale} />
      {staffPreview ? <PublicStaffPreviewLazy data={staffPreview} /> : null}
    </>
  );
}

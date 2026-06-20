import { Suspense } from "react";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { Link } from "@/i18n/navigation";
import { PublicSiteSettingsForm } from "@/components/admin/settings/PublicSiteSettingsForm";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { requireStaff } from "@/lib/auth/require-staff";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
import { getLocale, getTranslations } from "next-intl/server";

export default async function PublicSiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, locale, staff, config] = await Promise.all([
    getTranslations("admin.pages.publicSite"),
    searchParams,
    getLocale(),
    requireStaff(),
    getPublicSiteConfigForAdmin().catch(() => null),
  ]);

  if (!config) {
    return (
      <>
        <SettingsPageHeader title={t("title")} />
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </>
    );
  }

  if (staff.role === "operator") {
    await redirect("/admin/settings?access=role");
  }

  return (
    <>
      <SettingsPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link
            href="/"
            target="_blank"
            className="settings-primary-link settings-primary-link--ghost"
          >
            {t("previewSite")}
          </Link>
        }
      />
      <SettingsAlerts
        alerts={
          params.saved === "1"
            ? [{ tone: "success", message: t("saved") }]
            : []
        }
      />
      <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
        <PublicSiteSettingsForm config={config} locale={locale} />
      </Suspense>
    </>
  );
}

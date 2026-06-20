import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { PublicSiteSettingsForm } from "@/components/admin/settings/PublicSiteSettingsForm";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
import { getLocale, getTranslations } from "next-intl/server";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  guardSettingsPermission,
} from "@/lib/settings/page-context";

export default async function PublicSiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, locale, ctx, config] = await Promise.all([
    getTranslations("admin.pages.publicSite"),
    searchParams,
    getLocale(),
    guardSettingsPermission("pension_settings"),
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

  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

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
      <SettingsAlerts alerts={alerts} />
      <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
        <PublicSiteSettingsForm config={config} locale={locale} readOnly={readOnly} />
      </Suspense>
    </>
  );
}

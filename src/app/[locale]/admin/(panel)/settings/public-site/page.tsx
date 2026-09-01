import { Suspense } from "react";
import { PublicSiteSettingsForm } from "@/features/settings/ui/PublicSiteSettingsForm";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { loadPublicSiteAdminBundle } from "@/features/settings/loaders";
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
  const [t, tSettings, params, locale, ctx, bundle] = await Promise.all([
    getTranslations("admin.pages.publicSite"),
    getTranslations("admin.pages.settings"),
    searchParams,
    getLocale(),
    guardSettingsPermission("pension_settings"),
    loadPublicSiteAdminBundle(),
  ]);

  if (!bundle) {
    return (
      <SettingsPageLayout title={t("title")}>
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </SettingsPageLayout>
    );
  }

  const { config, primaryContact } = bundle;
  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("title")}
      description={t("description")}
      previewHref="/"
      previewLabel={tSettings("viewOnSite")}
      previewExternal
    >
      <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
        <PublicSiteSettingsForm
          config={config}
          locale={locale}
          primaryContact={primaryContact}
          readOnly={readOnly}
        />
      </Suspense>
    </SettingsPageLayout>
  );
}

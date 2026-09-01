import { Suspense } from "react";
import { GuestAppSettingsForm } from "@/features/settings/ui/GuestAppSettingsForm";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { loadGuestAppSettingsPage } from "@/features/settings/loaders";
import { getTranslations } from "next-intl/server";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  guardSettingsPermission,
} from "@/lib/settings/page-context";

export default async function GuestAppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, tSettings, params, ctx, { tenant, settings }] = await Promise.all([
    getTranslations("admin.pages.guestApp"),
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    loadGuestAppSettingsPage(),
  ]);

  if (!tenant) {
    return (
      <SettingsPageLayout title={t("title")}>
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </SettingsPageLayout>
    );
  }

  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("title")}
      description={t("description")}
      previewHref="/stay/demo"
      previewLabel={tSettings("viewOnSite")}
      previewExternal
    >
      {!settings ? (
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      ) : (
        <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
          <GuestAppSettingsForm settings={settings} readOnly={readOnly} />
        </Suspense>
      )}
    </SettingsPageLayout>
  );
}

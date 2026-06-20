import { Suspense } from "react";
import { GuestAppSettingsForm } from "@/components/admin/settings/GuestAppSettingsForm";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { ensureGuestAppSettingsRow } from "@/services/guest-app/mutations";
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
  const [t, params, ctx, tenant] = await Promise.all([
    getTranslations("admin.pages.guestApp"),
    searchParams,
    guardSettingsPermission("pension_settings"),
    resolveRequestTenant(),
  ]);

  if (!tenant) {
    return (
      <>
        <SettingsPageHeader title={t("title")} />
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </>
    );
  }

  const settings = await ensureGuestAppSettingsRow(tenant.id).catch(() => null);
  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

  return (
    <>
      <SettingsPageHeader title={t("title")} description={t("description")} />
      <SettingsAlerts alerts={alerts} />
      {!settings ? (
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      ) : (
        <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
          <GuestAppSettingsForm settings={settings} readOnly={readOnly} />
        </Suspense>
      )}
    </>
  );
}

import { Suspense } from "react";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { GuestAppSettingsForm } from "@/components/admin/settings/GuestAppSettingsForm";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { requireStaff } from "@/lib/auth/require-staff";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { ensureGuestAppSettingsRow } from "@/services/guest-app/mutations";
import { getLocale, getTranslations } from "next-intl/server";

export default async function GuestAppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, staff, tenant] = await Promise.all([
    getTranslations("admin.pages.guestApp"),
    searchParams,
    requireStaff(),
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

  if (staff.role === "operator") {
    await redirect("/admin/settings?access=role");
  }

  const settings = await ensureGuestAppSettingsRow(tenant.id).catch(() => null);

  return (
    <>
      <SettingsPageHeader title={t("title")} description={t("description")} />
      <SettingsAlerts
        alerts={
          params.saved === "1"
            ? [{ tone: "success", message: t("saved") }]
            : []
        }
      />
      {!settings ? (
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      ) : (
        <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
          <GuestAppSettingsForm settings={settings} />
        </Suspense>
      )}
    </>
  );
}

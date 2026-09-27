import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { GuestAppSettingsForm } from "@/features/settings/ui/GuestAppSettingsForm";
import { loadGuestAppSettingsPage } from "@/features/settings/loaders";
import { getTranslations } from "next-intl/server";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  guardSettingsPermission,
} from "@/lib/settings/page-context";
import "@/styles/features/admin/admin-public-site-studio.css";
import "@/styles/features/admin/admin-guest-app-preview.css";

export default async function GuestAppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, ctx, { tenant, settings, displayName, publicThemeId, logoUrl }] =
    await Promise.all([
      getTranslations("admin.pages.guestApp"),
      searchParams,
      guardSettingsPermission("pension_settings"),
      loadGuestAppSettingsPage(),
    ]);

  if (!tenant || !settings) {
    return (
      <div className="pub-site-studio-fallback">
        <Link href="/admin/settings" className="pub-site-studio__back-settings">
          ← {t("studioBackSettings")}
        </Link>
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </div>
    );
  }

  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

  return (
    <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
      <GuestAppSettingsForm
        settings={settings}
        displayName={displayName}
        publicThemeId={publicThemeId}
        logoUrl={logoUrl}
        readOnly={readOnly}
        alerts={alerts}
      />
    </Suspense>
  );
}

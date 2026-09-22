import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { PublicSiteSettingsForm } from "@/features/settings/ui/PublicSiteSettingsForm";
import { loadPublicSiteAdminBundle } from "@/features/settings/loaders";
import { getLocale, getTranslations } from "next-intl/server";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  guardSettingsPermission,
} from "@/lib/settings/page-context";
import "@/styles/features/admin/admin-public-site-studio.css";

export default async function PublicSiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, locale, ctx, bundle] = await Promise.all([
    getTranslations("admin.pages.publicSite"),
    searchParams,
    getLocale(),
    guardSettingsPermission("pension_settings"),
    loadPublicSiteAdminBundle(),
  ]);

  if (!bundle) {
    return (
      <div className="pub-site-studio-fallback">
        <Link href="/admin/settings" className="pub-site-studio__back-settings">
          ← {t("studioBackSettings")}
        </Link>
        <p className="settings-empty settings-empty--error">{t("loadError")}</p>
      </div>
    );
  }

  const { config, primaryContact } = bundle;
  const alerts = await buildSettingsAlerts(params);
  const readOnly = !canEditPensionSettingsUi(ctx);
  if (readOnly) alerts.push({ tone: "info", message: t("readOnly") });

  return (
    <Suspense fallback={<div className="settings-skeleton" aria-busy="true" />}>
      <PublicSiteSettingsForm
        config={config}
        locale={locale}
        primaryContact={primaryContact}
        readOnly={readOnly}
        alerts={alerts}
      />
    </Suspense>
  );
}
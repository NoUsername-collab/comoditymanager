import { getTranslations } from "next-intl/server";
import { AdminPalettePicker } from "@/features/settings/ui/AdminPalettePicker";
import { AdminFxSettings } from "@/features/settings/ui/AdminFxSettings";
import { AppearanceSettingsAsideLazy } from "@/features/settings/ui/AppearanceSettingsAsideLazy";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import {
  buildSettingsAlerts,
  guardSettingsPermission,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";
import { loadPublicSiteThemeForAdmin } from "@/features/settings/loaders";
import { updateAppearanceSettingsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsAppearancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    guardSettingsPermission("pension_settings"),
  ]);

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const settings = ctx.pensionResult.settings;
  if (!settings || !ctx.appearance) {
    return (
      <SettingsPageLayout alerts={alerts} title={t("navAppearance")}>
        <p className="settings-empty">{t("notConfigured")}</p>
      </SettingsPageLayout>
    );
  }

  const publicSiteConfig = await loadPublicSiteThemeForAdmin();

  return (
    <SettingsPageLayout
      alerts={alerts}
      title={t("navAppearance")}
      description={t("visualsSubtitle")}
      previewHref="/admin"
      previewLabel={t("livePreview")}
      previewPanel={
        <AppearanceSettingsAsideLazy publicThemeId={publicSiteConfig.themeId} />
      }
    >
      <AdminPendingForm action={updateAppearanceSettingsAction} className="settings-form-stack">
        <input type="hidden" name="id" value={settings.id} />
        <SettingsSection title={t("visualsTitle")} description={t("appearanceAdminHint")}>
          <AdminPalettePicker />
        </SettingsSection>
        <SettingsSection title={t("fxTitle")} description={t("fxSubtitle")} defaultOpen={false}>
          <AdminFxSettings />
        </SettingsSection>
        <SettingsSaveBar>
          <AdminSubmitButton type="submit" variant="primary" size="lg">
            {t("saveTheme")}
          </AdminSubmitButton>
        </SettingsSaveBar>
      </AdminPendingForm>
    </SettingsPageLayout>
  );
}

import { getTranslations } from "next-intl/server";
import { AdminPalettePicker } from "@/features/settings/ui/AdminPalettePicker";
import { AdminDisplayLayoutPicker } from "@/features/settings/ui/AdminDisplayLayoutPicker";
import { AdminFxSettings } from "@/features/settings/ui/AdminFxSettings";
import { AppearanceSettingsAsideLazy } from "@/features/settings/ui/AppearanceSettingsAsideLazy";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
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
    loadSettingsStaffContext(),
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

  const canEditGlobalTheme = canEditPensionSettingsUi(ctx);
  const publicSiteConfig = await getPublicSiteConfigForAdmin();

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
      <SettingsSection title={t("displayLayoutTitle")} description={t("displayLayoutHint")}>
        <AdminDisplayLayoutPicker />
      </SettingsSection>
      {canEditGlobalTheme ? (
        <AdminPendingForm action={updateAppearanceSettingsAction} className="settings-form-stack">
          <input type="hidden" name="id" value={settings.id} />
          <SettingsSection title={t("visualsTitle")} description={t("visualsSubtitle")}>
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
      ) : null}
    </SettingsPageLayout>
  );
}

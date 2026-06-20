import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/require-staff";
import { AdminPalettePicker } from "@/components/admin/settings/AdminPalettePicker";
import { AdminDisplayLayoutPicker } from "@/components/admin/settings/AdminDisplayLayoutPicker";
import { AdminFxSettings } from "@/components/admin/settings/AdminFxSettings";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import {
  buildSettingsAlerts,
  canEditPensionSettingsUi,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";
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
  await requireStaff();

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const settings = ctx.pensionResult.settings;
  if (!settings || !ctx.appearance) {
    return (
      <>
        <SettingsPageHeader title={t("navAppearance")} />
        <SettingsAlerts alerts={alerts} />
      </>
    );
  }

  const canEditGlobalTheme = canEditPensionSettingsUi(ctx);

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navAppearance")} description={t("visualsSubtitle")} />
      <SettingsSection title={t("displayLayoutTitle")} description={t("displayLayoutHint")}>
        <AdminDisplayLayoutPicker />
      </SettingsSection>
      {canEditGlobalTheme ? (
        <AdminPendingForm action={updateAppearanceSettingsAction} className="settings-form-stack">
          <input type="hidden" name="id" value={settings.id} />
          <SettingsSection title={t("visualsTitle")} description={t("visualsSubtitle")}>
            <AdminPalettePicker />
          </SettingsSection>
          <SettingsSection title={t("fxTitle")} description={t("fxSubtitle")}>
            <AdminFxSettings />
          </SettingsSection>
          <div className="settings-form-stack__submit">
            <AdminSubmitButton type="submit" variant="primary" size="lg">
              {t("saveTheme")}
            </AdminSubmitButton>
          </div>
        </AdminPendingForm>
      ) : null}
    </>
  );
}

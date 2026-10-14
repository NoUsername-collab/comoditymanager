import { updateBedStockAction } from "@/features/settings/actions";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import type { PensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

export async function ExtraBedsCapForm({
  settings,
}: {
  settings: PensionSettings;
}) {
  const t = await getTranslations("admin.pages.settingsLocation.extraBeds");

  return (
    <AdminPendingForm action={updateBedStockAction} className="admin-settings-form">
      <input type="hidden" name="id" value={settings.id} />
      <p className="admin-settings-hint">{t("hint")}</p>
      <div className="admin-settings-fields">
        <label>
          <span>{t("label")}</span>
          <input
            name="total_extra_beds_max"
            type="number"
            min={0}
            max={999}
            step={1}
            required
            defaultValue={settings.total_extra_beds_max}
          />
        </label>
        <label>
          <span>{t("cotsLabel")}</span>
          <input
            name="total_cots_max"
            type="number"
            min={0}
            max={999}
            step={1}
            required
            defaultValue={settings.total_cots_max}
          />
          <span className="admin-settings-hint">{t("cotsHint")}</span>
        </label>
      </div>
      <SettingsSaveBar>
        <AdminSubmitButton type="submit" variant="primary" size="lg">
          {t("save")}
        </AdminSubmitButton>
      </SettingsSaveBar>
    </AdminPendingForm>
  );
}

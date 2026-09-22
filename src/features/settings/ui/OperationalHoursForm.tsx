import { updateOperationalSettingsAction } from "@/features/settings/actions";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import type { PensionSettings } from "@/services/pension-settings";
import { getTranslations } from "next-intl/server";

export async function OperationalHoursForm({
  settings,
}: {
  settings: PensionSettings;
}) {
  const [t, tCommon] = await Promise.all([
    getTranslations("admin.pages.settings.stayHours"),
    getTranslations("admin.common"),
  ]);

  return (
    <AdminPendingForm action={updateOperationalSettingsAction} className="admin-settings-form">
      <input type="hidden" name="id" value={settings.id} />
      <p className="admin-settings-hint">{t("hint")}</p>
      <div className="admin-settings-fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span>{tCommon("checkInHour")}</span>
            <input
              name="default_check_in_time"
              type="time"
              required
              defaultValue={settings.default_check_in_time}
            />
          </label>
          <label>
            <span>{tCommon("checkOutHour")}</span>
            <input
              name="default_check_out_time"
              type="time"
              required
              defaultValue={settings.default_check_out_time}
            />
          </label>
        </div>
        <label>
          <span>{tCommon("extraBedsCap")}</span>
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
      </div>
      <SettingsSaveBar>
        <AdminSubmitButton type="submit" variant="primary" size="lg">
          {t("save")}
        </AdminSubmitButton>
      </SettingsSaveBar>
    </AdminPendingForm>
  );
}

import { Link } from "@/i18n/navigation";
import { loadSettingsLocationPage } from "@/features/settings/loaders";
import { AdminFactoryResetPanel } from "@/features/settings/ui/AdminFactoryResetPanel";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationLockBar } from "@/features/settings/ui/AdminLocationLockBar";
import { AdminStaffPasswordPanel } from "@/features/settings/ui/AdminStaffPasswordPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import type { SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { updateOperationalSettingsAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function LocationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string; unlocked?: string; locked?: string }>;
}) {
  const [tPage, tCommon, , params, locationPage] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    requireLocationAdmin(),
    searchParams,
    loadSettingsLocationPage(),
  ]);
  const { staffAccounts, pensionResult, factoryResetEnabled } = locationPage;

  const settings = pensionResult.settings;
  let error = pensionResult.error;
  if (error === "generic") {
    error = tCommon("error");
  }

  const alerts: SettingsAlert[] = [
    params.unlocked === "1"
      ? { tone: "success", message: tPage("unlockedForTwoHours") }
      : null,
    params.locked === "1"
      ? { tone: "info", message: tPage("unlock.ownerLockClosed") }
      : null,
    params.saved === "1"
      ? { tone: "success", message: tPage("operationalSaved") }
      : null,
    params.reset === "1"
      ? { tone: "success", message: tPage("resetCompleted") }
      : null,
    error ? { tone: "error", message: error } : null,
  ].filter((alert): alert is SettingsAlert => alert !== null);

  return (
    <SettingsPageLayout
      title={tPage("title")}
      description={tPage("description")}
      alerts={alerts}
      actions={<AdminLocationLockBar />}
    >
      {settings ? (
        <>
          <div className="settings-location-steps">
            <div className="settings-location-steps__card">
              <p className="settings-location-steps__label">{tPage("steps.structureTitle")}</p>
              <p className="settings-location-steps__headline">{tPage("steps.structureHeadline")}</p>
              <p className="settings-location-steps__body">{tPage("steps.structureBody")}</p>
            </div>
            <div className="settings-location-steps__card">
              <p className="settings-location-steps__label">{tPage("steps.modularTitle")}</p>
              <p className="settings-location-steps__headline">{tPage("steps.modularHeadline")}</p>
              <p className="settings-location-steps__body">{tPage("steps.modularBody")}</p>
            </div>
            <div className="settings-location-steps__card">
              <p className="settings-location-steps__label">{tPage("steps.staffTitle")}</p>
              <p className="settings-location-steps__headline">{tPage("steps.staffHeadline")}</p>
              <p className="settings-location-steps__body">{tPage("steps.staffBody")}</p>
            </div>
          </div>

          <SettingsSection
            title={tPage("operational.title")}
            description={tPage("operational.subtitle")}
          >
            <p className="mb-4 text-sm text-zinc-500">
              {tPage("operational.identityHint")}{" "}
              <Link href="/admin/settings/identity" className="underline">
                {tPage("operational.identityLink")}
              </Link>
            </p>
            <AdminPendingForm action={updateOperationalSettingsAction} className="admin-settings-form">
              <input type="hidden" name="id" value={settings.id} />
              <div className="admin-settings-fields">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span>{tCommon("checkInHour")}</span>
                    <input
                      name="default_check_in_time"
                      type="time"
                      defaultValue={settings.default_check_in_time}
                    />
                  </label>
                  <label>
                    <span>{tCommon("checkOutHour")}</span>
                    <input
                      name="default_check_out_time"
                      type="time"
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
                    defaultValue={settings.total_extra_beds_max}
                  />
                </label>
              </div>
              <SettingsSaveBar>
                <AdminSubmitButton type="submit" variant="primary" size="lg">
                  {tPage("operational.save")}
                </AdminSubmitButton>
              </SettingsSaveBar>
            </AdminPendingForm>
          </SettingsSection>

          <SettingsSection
            title={tPage("structure.title")}
            description={tPage("structure.subtitle")}
          >
            <div className="settings-form-stack">
              <p className="admin-settings-hint">{tPage("structure.hint")}</p>
              <div className="settings-overview__grid">
                <Link href="/admin/settings/location/structure" className="settings-overview-card">
                  <span className="settings-overview-card__title">{tPage("structure.cardStructureTitle")}</span>
                  <span className="settings-overview-card__desc">{tPage("structure.cardStructureBody")}</span>
                </Link>
                <Link href="/admin/settings/location/setup" className="settings-overview-card">
                  <span className="settings-overview-card__title">{tPage("structure.cardModularTitle")}</span>
                  <span className="settings-overview-card__desc">{tPage("structure.cardModularBody")}</span>
                </Link>
              </div>
              <Link href="/admin/rooms" className="settings-overview-card">
                <span className="settings-overview-card__title">{tCommon("rooms")}</span>
                <span className="settings-overview-card__desc">{tPage("structure.cardRoomsBody")}</span>
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            title={tCommon("staffAccounts")}
            description={tPage("staff.subtitle")}
          >
            <AdminStaffPasswordPanel accounts={staffAccounts} />
            <p className="mt-3 text-sm">
              <Link
                href="/admin/settings/staff"
                className="font-medium text-zinc-700 underline hover:text-zinc-900"
              >
                {tPage("staff.manageTeamLink")}
              </Link>
            </p>
          </SettingsSection>

          {factoryResetEnabled ? (
            <SettingsSection
              title={tPage("danger.title")}
              description={tCommon("factoryResetSubtitle")}
              className="settings-section--danger"
            >
              <AdminFactoryResetPanel />
            </SettingsSection>
          ) : null}
        </>
      ) : null}
    </SettingsPageLayout>
  );
}

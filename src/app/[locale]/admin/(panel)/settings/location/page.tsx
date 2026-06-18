import { Link } from "@/i18n/navigation";
import { getPensionSettings } from "@/services/pension-settings";
import { AdminFactoryResetPanel } from "@/components/admin/settings/AdminFactoryResetPanel";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationLockBar } from "@/components/admin/settings/AdminLocationLockBar";
import { AdminStaffPasswordPanel } from "@/components/admin/settings/AdminStaffPasswordPanel";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { isFactoryResetEnabled } from "@/services/database-reset";
import { listStaffAccountsForCurrentTenant } from "@/services/staff-accounts";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { updateOperationalSettingsAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function LocationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string; unlocked?: string; locked?: string }>;
}) {
  const [tPage, tCommon, , params, staffAccounts, pensionResult] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    requireLocationAdmin(),
    searchParams,
    listStaffAccountsForCurrentTenant(),
    (async () => {
      try {
        return {
          settings: await getPensionSettings(),
          error: null as string | null,
        };
      } catch (e) {
        return {
          settings: null as Awaited<ReturnType<typeof getPensionSettings>>,
          error: e instanceof Error ? e.message : "generic",
        };
      }
    })(),
  ]);

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
    <>
      <SettingsPageHeader
        title={tPage("title")}
        description={tPage("description")}
        actions={<AdminLocationLockBar />}
      />
      <SettingsAlerts alerts={alerts} />

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
              <div className="settings-form-stack__submit">
                <AdminSubmitButton type="submit" className="settings-form-stack__btn">
                  {tPage("operational.save")}
                </AdminSubmitButton>
              </div>
            </AdminPendingForm>
          </SettingsSection>

          <SettingsSection
            title={tPage("structure.title")}
            description={tPage("structure.subtitle")}
          >
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">{tPage("structure.hint")}</p>
              <div className="admin-settings-location-nav grid gap-3 md:grid-cols-2">
                <Link
                  href="/admin/settings/location/structure"
                  className="admin-settings-location-nav__card rounded-xl border-2 border-zinc-900 bg-zinc-900 px-4 py-4 text-white shadow-sm hover:bg-zinc-800"
                >
                  <span className="block text-sm font-semibold">
                    {tPage("structure.cardStructureTitle")}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-200">
                    {tPage("structure.cardStructureBody")}
                  </span>
                  <span className="mt-2 inline-block text-xs font-bold uppercase tracking-wide text-emerald-300">
                    {tPage("structure.recommended")}
                  </span>
                </Link>
                <Link
                  href="/admin/settings/location/setup"
                  className="admin-settings-location-nav__card rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-4 hover:bg-emerald-100"
                >
                  <span className="block text-sm font-semibold text-emerald-950">
                    {tPage("structure.cardModularTitle")}
                  </span>
                  <span className="mt-1 block text-sm text-emerald-900">
                    {tPage("structure.cardModularBody")}
                  </span>
                </Link>
              </div>
              <Link
                href="/admin/rooms"
                className="admin-settings-location-nav__rooms-link mt-3 block rounded-xl border border-zinc-300 bg-white px-4 py-3 hover:bg-zinc-50"
              >
                <span className="text-sm font-semibold text-zinc-900">{tCommon("rooms")}</span>
                <span className="mt-0.5 block text-sm text-zinc-600">
                  {tPage("structure.cardRoomsBody")}
                </span>
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

          {isFactoryResetEnabled() ? (
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
    </>
  );
}

import { Link } from "@/i18n/navigation";
import { getPensionSettings } from "@/services/pension-settings";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminFactoryResetPanel } from "@/components/admin/settings/AdminFactoryResetPanel";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationLockBar } from "@/components/admin/settings/AdminLocationLockBar";
import { AdminStaffPasswordPanel } from "@/components/admin/settings/AdminStaffPasswordPanel";
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

  return (
    <AdminRetroPageFrame
      title={tPage("title")}
      className="admin-settings-page w-full max-w-none"
      description={tPage("description")}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/settings"
          className="admin-settings-back inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          {tPage("backToSettings")}
        </Link>
        <AdminLocationLockBar />
      </div>

      {params.unlocked === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {tPage("unlockedForTwoHours")}
        </p>
      )}

      {params.locked === "1" && (
        <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {tPage("unlock.ownerLockClosed")}
        </p>
      )}

      {params.saved === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {tPage("operationalSaved")}
        </p>
      )}

      {params.reset === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {tPage("resetCompleted")}
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {settings && (
        <>
          <div className="mb-4 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                {tPage("steps.structureTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {tPage("steps.structureHeadline")}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {tPage("steps.structureBody")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                {tPage("steps.modularTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {tPage("steps.modularHeadline")}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {tPage("steps.modularBody")}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                {tPage("steps.staffTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {tPage("steps.staffHeadline")}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {tPage("steps.staffBody")}
              </p>
            </div>
          </div>

          <SettingsSlidePanel
            title={tPage("operational.title")}
            subtitle={tPage("operational.subtitle", { name: settings.display_name })}
            icon="⚙️"
            defaultOpen
          >
            <AdminPendingForm
              action={updateOperationalSettingsAction}
              className="admin-settings-form"
            >
              <input type="hidden" name="id" value={settings.id} />
              <div className="admin-settings-fields">
                <label>
                  <span>{tPage("operational.displayName")}</span>
                  <input
                    name="display_name"
                    defaultValue={settings.display_name}
                  />
                </label>
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
              <div className="admin-settings-submit mt-4">
                <AdminSubmitButton type="submit" className="admin-settings-submit__btn">
                  {tPage("operational.save")}
                </AdminSubmitButton>
              </div>
            </AdminPendingForm>
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title={tPage("structure.title")}
            subtitle={tPage("structure.subtitle")}
            icon="🏢"
            defaultOpen
          >
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                {tPage("structure.hint")}
              </p>
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
                <span className="text-sm font-semibold text-zinc-900">
                  {tCommon("rooms")}
                </span>
                <span className="mt-0.5 block text-sm text-zinc-600">
                  {tPage("structure.cardRoomsBody")}
                </span>
              </Link>
            </div>
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title={tCommon("staffAccounts")}
            subtitle={tPage("staff.subtitle")}
            icon="🔐"
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
          </SettingsSlidePanel>

          {isFactoryResetEnabled() && (
            <SettingsSlidePanel
              title={tPage("danger.title")}
              subtitle={tCommon("factoryResetSubtitle")}
              icon="⚠️"
            >
              <AdminFactoryResetPanel />
            </SettingsSlidePanel>
          )}
        </>
      )}
    </AdminRetroPageFrame>
  );
}

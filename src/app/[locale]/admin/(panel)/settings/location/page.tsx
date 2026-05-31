import { Link } from "@/i18n/navigation";
import { getPensionSettings } from "@/services/pension-settings";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminFactoryResetPanel } from "@/components/admin/settings/AdminFactoryResetPanel";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationLockButton } from "@/components/admin/settings/AdminLocationUnlockForm";
import { AdminStaffPasswordPanel } from "@/components/admin/settings/AdminStaffPasswordPanel";
import { isFactoryResetEnabled } from "@/services/database-reset";
import { listStaffAccountsForCurrentTenant } from "@/services/staff-accounts";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { AdminRoomCatalogPanel } from "@/components/admin/catalog/AdminRoomCatalogPanel";
import { listRoomOptions, listRoomTypes } from "@/services/room-catalog";
import { updateOperationalSettingsAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function LocationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string; unlocked?: string }>;
}) {
  const tPage = await getTranslations("admin.pages.settingsLocation");
  const tCommon = await getTranslations("admin.common");
  await requireLocationAdmin();
  const params = await searchParams;
  const staffAccounts = await listStaffAccountsForCurrentTenant();

  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  let error: string | null = null;

  try {
    settings = await getPensionSettings();
  } catch (e) {
    error = e instanceof Error ? e.message : tCommon("error");
  }

  let catalogError: string | null = null;
  let catalogTypes: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];

  try {
    catalogTypes = await listRoomTypes(true);
    catalogOptions = await listRoomOptions(true);
  } catch (e) {
    catalogError = e instanceof Error ? e.message : tPage("catalogUnavailable");
  }

  return (
    <AdminRetroPageFrame
      title={tPage("title")}
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description={tPage("description")}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/settings"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          {tPage("backToSettings")}
        </Link>
        <AdminLocationLockButton />
      </div>

      {params.unlocked === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {tPage("unlockedForTwoHours")}
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
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
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
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">
                {tPage("steps.catalogTitle")}
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {tPage("steps.catalogHeadline")}
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                {tPage("steps.catalogBody")}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
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
              <div className="grid gap-3 md:grid-cols-2">
                <Link
                  href="/admin/settings/location/structure"
                  className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-4 py-4 text-white shadow-sm hover:bg-zinc-800"
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
                  href="/admin/buildings"
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-4 hover:bg-zinc-50"
                >
                  <span className="block text-sm font-semibold text-zinc-900">
                    {tPage("structure.cardOccupancyTitle")}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600">
                    {tPage("structure.cardOccupancyBody")}
                  </span>
                </Link>
              </div>
              <Link
                href="/admin/rooms"
                className="mt-3 block rounded-xl border border-zinc-300 bg-white px-4 py-3 hover:bg-zinc-50"
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
            title={tCommon("modularCatalog")}
            subtitle={tPage("catalog.subtitle")}
            icon="📦"
            defaultOpen
          >
            <AdminRoomCatalogPanel
              types={catalogTypes}
              options={catalogOptions}
              catalogError={catalogError}
            />
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

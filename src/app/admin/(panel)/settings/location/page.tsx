import Link from "next/link";
import { getPensionSettings } from "@/services/pension-settings";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminFactoryResetPanel } from "@/components/admin/settings/AdminFactoryResetPanel";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationLockButton } from "@/components/admin/settings/AdminLocationUnlockForm";
import { AdminStaffPasswordPanel } from "@/components/admin/settings/AdminStaffPasswordPanel";
import { isFactoryResetEnabled } from "@/services/database-reset";
import { listStaffAccounts } from "@/services/staff-accounts";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { AdminRoomCatalogPanel } from "@/components/admin/catalog/AdminRoomCatalogPanel";
import { listRoomOptions, listRoomTypes } from "@/services/room-catalog";
import { updateOperationalSettingsAction } from "../actions";

export default async function LocationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string; unlocked?: string }>;
}) {
  await requireLocationAdmin();
  const params = await searchParams;
  const staffAccounts = listStaffAccounts();

  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  let error: string | null = null;

  try {
    settings = await getPensionSettings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  let catalogError: string | null = null;
  let catalogTypes: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];

  try {
    catalogTypes = await listRoomTypes(true);
    catalogOptions = await listRoomOptions(true);
  } catch (e) {
    catalogError = e instanceof Error ? e.message : "Catalog indisponibil";
  }

  return (
    <AdminRetroPageFrame
      title="Administrare locație — Casa Emil"
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description="Configurare pensiune, structură clădiri/camere, catalog modular și conturi staff."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin/settings"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          ← Înapoi la setări
        </Link>
        <AdminLocationLockButton />
      </div>

      {params.unlocked === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Administrare locație deblocată pentru 2 ore.
        </p>
      )}

      {params.saved === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Setări operaționale salvate.
        </p>
      )}

      {params.reset === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Reset complet. Poți configura din nou clădirile și camerele.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {settings && (
        <>
          <SettingsSlidePanel
            title="Operațional"
            subtitle={`${settings.display_name} · ore și paturi extra`}
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
                  <span>Nume afișat</span>
                  <input
                    name="display_name"
                    defaultValue={settings.display_name}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span>Check-in (ora)</span>
                    <input
                      name="default_check_in_time"
                      type="time"
                      defaultValue={settings.default_check_in_time}
                    />
                  </label>
                  <label>
                    <span>Check-out (ora)</span>
                    <input
                      name="default_check_out_time"
                      type="time"
                      defaultValue={settings.default_check_out_time}
                    />
                  </label>
                </div>
                <label>
                  <span>Plafon paturi suplimentare (total pensiune)</span>
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
                  Salvează operațional
                </AdminSubmitButton>
              </div>
            </AdminPendingForm>
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title="Structură"
            subtitle="Clădiri, camere, etaje"
            icon="🏢"
            defaultOpen
          >
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/buildings"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                Clădiri
              </Link>
              <Link
                href="/admin/rooms"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                Camere
              </Link>
            </div>
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title="Catalog modular"
            subtitle="Tipuri cameră, opțiuni (AC, frigider…) — politici per clădire"
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
            title="Conturi staff"
            subtitle="Schimbă parola Admin sau Operator"
            icon="🔐"
          >
            <AdminStaffPasswordPanel accounts={staffAccounts} />
          </SettingsSlidePanel>

          {isFactoryResetEnabled() && (
            <SettingsSlidePanel
              title="Zonă periculoasă"
              subtitle="Reset factory — doar staging / dev"
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

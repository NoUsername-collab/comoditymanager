import Link from "next/link";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { AdminPalettePicker } from "@/components/admin/settings/AdminPalettePicker";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminFxSettings } from "@/components/admin/settings/AdminFxSettings";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationUnlockForm } from "@/components/admin/settings/AdminLocationUnlockForm";
import { AdminActivityHistoryPanel } from "@/components/admin/activity/AdminActivityHistoryPanel";
import { AdminCurrentThemeSummary } from "@/components/admin/settings/AdminCurrentThemeSummary";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";
import { getStaffRole } from "@/lib/auth/roles";
import { requireStaff } from "@/lib/auth/require-staff";
import { updateAppearanceSettingsAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    location?: string;
    section?: string;
  }>;
}) {
  const params = await searchParams;
  const { user } = await requireStaff();
  const role = getStaffRole(user);
  const locationUnlocked = await isAdminLocationUnlocked();

  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  let error: string | null = null;

  try {
    settings = await getPensionSettings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  const appearance = settings ? pensionAppearanceSettings(settings) : null;

  return (
    <AdminRetroPageFrame
      title="Setări — Casa Emil"
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description={
        role === "operator"
          ? "Sunet și temă — disponibile pentru operator. Configurarea locației necesită parola admin."
          : "Sunet și temă pentru panou. Configurarea locației se face după re-autentificare admin."
      }
    >
      {params.saved === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Temă salvată.
        </p>
      )}

      {params.location === "locked" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Administrarea locației este blocată. Introdu parola admin mai jos.
        </p>
      )}

      {params.location === "forbidden" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Această secțiune necesită deblocarea administrării locației.
        </p>
      )}

      {params.location === "closed" && (
        <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Administrare locație închisă.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {!settings && !error && (
        <p className="text-zinc-500">
          Setările pensiunii nu sunt încă configurate.
        </p>
      )}

      {settings && appearance && (
        <>
          <div className="admin-settings-summary">
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">Pensiune</span>
              <span className="admin-settings-summary__value">
                {settings.display_name}
              </span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">
                Check-in / out
              </span>
              <span className="admin-settings-summary__value">
                {settings.default_check_in_time} →{" "}
                {settings.default_check_out_time}
              </span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">Temă activă</span>
              <span className="admin-settings-summary__value">
                <AdminCurrentThemeSummary />
              </span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">Rol</span>
              <span className="admin-settings-summary__value">
                {role === "admin" ? "Admin" : "Operator"}
              </span>
            </div>
          </div>

          <SettingsSlidePanel
            title="Feedback & sunet"
            subtitle="Efecte la confirmare — local pe dispozitiv"
            icon="🔔"
            defaultOpen
          >
            <AdminFxSettings />
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title="Istoric acțiuni"
            subtitle="Rezervări + admin, exact jurnalul vechi mutat aici"
            icon="🕘"
            defaultOpen={params.section === "history"}
          >
            <AdminActivityHistoryPanel />
          </SettingsSlidePanel>

          <AdminPendingForm
            action={updateAppearanceSettingsAction}
            className="admin-settings-form mt-6"
          >
            <input type="hidden" name="id" value={settings.id} />

            <SettingsSlidePanel
              title="Aspect panou"
              subtitle="Temă modulară activă"
              icon="🎨"
              defaultOpen
            >
              <AdminPalettePicker />
            </SettingsSlidePanel>

            <div className="admin-settings-submit">
              <AdminSubmitButton type="submit" className="admin-settings-submit__btn">
                Salvează tema
              </AdminSubmitButton>
            </div>
          </AdminPendingForm>

          <SettingsSlidePanel
            title="Administrare locație"
            subtitle={
              locationUnlocked
                ? "Deblocat — singurul loc pentru creare/editare structură și camere"
                : "Necesită parola contului Admin"
            }
            icon="🏨"
            defaultOpen={params.location === "locked"}
          >
            {locationUnlocked ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">
                  Panoul de configurare este activ (2 ore). Orice creare sau
                  editare de structură, camere, catalog și staff pornește de aici.
                </p>
                <Link
                  href="/admin/settings/location"
                  className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Deschide centrul de configurare
                </Link>
              </div>
            ) : (
              <AdminLocationUnlockForm />
            )}
          </SettingsSlidePanel>
        </>
      )}
    </AdminRetroPageFrame>
  );
}

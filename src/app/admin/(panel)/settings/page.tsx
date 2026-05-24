import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { AdminPalettePicker } from "@/components/admin/settings/AdminPalettePicker";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { resolvePaletteDefinition } from "@/lib/admin-palettes";
import { AdminFxSettings } from "@/components/admin/settings/AdminFxSettings";
import { updateSettingsAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  let error: string | null = null;

  try {
    settings = await getPensionSettings();
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  const appearance = settings ? pensionAppearanceSettings(settings) : null;
  const activePalette = appearance
    ? resolvePaletteDefinition(appearance)
    : null;

  const sourceLabel = "Temă modulară (Default · Win95 · XP)";

  return (
    <AdminRetroPageFrame
      title="Setări pensiune — Casa Emil"
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description="Ore check-in/out, paturi extra și aspect panou — totul într-un singur loc, ușor de parcurs."
    >
      {params.saved === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Salvat. Reîncarcă o pagină admin dacă nu vezi paleta imediat.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error.includes("admin_palette") && (
            <span className="mt-1 block">
              Rulează migrarea{" "}
              <code className="text-xs">008_admin_palettes.sql</code> în Supabase.
            </span>
          )}
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
                {activePalette?.name ?? "—"} ·{" "}
                {appearance.admin_day_night === "day" ? "Zi" : "Noapte"}
              </span>
            </div>
          </div>

          <form action={updateSettingsAction} className="admin-settings-form">
            <input type="hidden" name="id" value={settings.id} />

            <SettingsSlidePanel
              title="Operațional"
              subtitle={`${settings.display_name} · ${settings.default_check_in_time} / ${settings.default_check_out_time}`}
              icon="⚙️"
              defaultOpen
            >
              <div className="admin-settings-fields">
                <label>
                  <span>Nume afișat</span>
                  <input
                    name="display_name"
                    defaultValue={settings.display_name}
                  />
                  <p className="admin-settings-hint">
                    Apare în header, facturi și comunicări cu oaspeții.
                  </p>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span>Check-in (ora)</span>
                    <input
                      name="default_check_in_time"
                      type="time"
                      defaultValue={settings.default_check_in_time}
                    />
                    <p className="admin-settings-hint">
                      Zona albastră „noapte” în Gantt pornește de aici.
                    </p>
                  </label>
                  <label>
                    <span>Check-out (ora)</span>
                    <input
                      name="default_check_out_time"
                      type="time"
                      defaultValue={settings.default_check_out_time}
                    />
                    <p className="admin-settings-hint">
                      Zona galbenă „plecare” se termină la această oră.
                    </p>
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
                  <p className="admin-settings-hint">
                    Limită globală pentru paturi extra la rezervări — nu per
                    cameră.
                  </p>
                </label>
              </div>
            </SettingsSlidePanel>

            <SettingsSlidePanel
              title="Feedback & sunet"
              subtitle="Efecte la confirmare — opțional"
              icon="🔔"
            >
              <AdminFxSettings />
            </SettingsSlidePanel>

            <SettingsSlidePanel
              title="Aspect panou"
              subtitle={`${activePalette?.name ?? "Temă"} · ${sourceLabel}`}
              icon="🎨"
              defaultOpen
            >
              <AdminPalettePicker defaultSettings={appearance} />
            </SettingsSlidePanel>

            <div className="admin-settings-submit">
              <p className="text-xs text-zinc-500">
                Modificările de aspect se previzualizează live; salvarea le
                persistă pentru toți adminii.
              </p>
              <button type="submit" className="admin-settings-submit__btn">
                Salvează toate setările
              </button>
            </div>
          </form>
        </>
      )}
    </AdminRetroPageFrame>
  );
}

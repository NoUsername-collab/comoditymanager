import Link from "next/link";
import "@/app/admin/admin-features.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";
import { AdminDayNightLiquid } from "@/components/admin/AdminDayNightLiquid";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminPaletteStyles } from "@/components/admin/AdminPaletteStyles";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { cereriNoiLinkText } from "@/lib/ro-copy";
import { countCereriNoi } from "@/services/bookings";
import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { getStaffRole } from "@/lib/auth/roles";
import { getStaffUser } from "@/lib/auth/require-staff";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";

const DEFAULT_APPEARANCE: AdminPaletteSettings = {
  admin_palette_source: "catalog",
  admin_palette_key: "default",
  admin_day_night: "night",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let cereriCount = 0;
  let appearanceSettings: AdminPaletteSettings = DEFAULT_APPEARANCE;

  try {
    cereriCount = await countCereriNoi();
  } catch {
    cereriCount = 0;
  }

  try {
    const pension = await getPensionSettings();
    if (pension) {
      appearanceSettings = pensionAppearanceSettings(pension);
    }
  } catch {
    /* migrare 008 poate lipsi */
  }

  let locationUnlocked = false;

  try {
    const user = await getStaffUser();
    getStaffRole(user);
    locationUnlocked = await isAdminLocationUnlocked();
  } catch {
    /* middleware redirecționează dacă nu e autentificat */
  }

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <AdminPaletteStyles settings={appearanceSettings} />
      <div className="admin-shell flex min-h-full flex-1 flex-col">
        <div className="admin-hud">
          <AdminDayNightLiquid />
          <div className="admin-hud__surface">
            <AdminTopBar />
            <AdminNav
              cereriCount={cereriCount}
              locationUnlocked={locationUnlocked}
            />
          </div>
        </div>

        {cereriCount > 0 && (
          <div className="admin-hud-alert px-6 py-2.5 text-center text-sm">
            Ai{" "}
            <Link href="/admin/bookings" className="admin-hud-alert__link">
              {cereriNoiLinkText(cereriCount)}
            </Link>{" "}
            de procesat
          </div>
        )}

        <AdminShellClient>
          <div className="admin-page-main flex-1">{children}</div>
        </AdminShellClient>
      </div>
    </AdminAppearanceProvider>
  );
}

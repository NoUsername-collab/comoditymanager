import Link from "next/link";
import "@/app/admin/admin-features.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { cereriNoiLinkText } from "@/lib/ro-copy";
import { countCereriNoi } from "@/services/bookings";
import type { ThemeSettings } from "@/lib/themes";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { getStaffRole } from "@/lib/auth/roles";
import { getStaffUser } from "@/lib/auth/require-staff";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";
import { loadTodayBoard } from "@/services/today-board";

const DEFAULT_APPEARANCE: ThemeSettings = {
  theme: "default",
  mode: "night",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cereriCount, pension] = await Promise.all([
    countCereriNoi().catch(() => 0),
    getPensionSettings().catch(() => null),
  ]);

  const checkInTime = pension?.default_check_in_time ?? "14:00";
  const checkOutTime = pension?.default_check_out_time ?? "11:00";
  const todayBoard = await loadTodayBoard(checkInTime, checkOutTime).catch(() => null);

  let appearanceSettings: ThemeSettings = DEFAULT_APPEARANCE;
  if (pension) {
    appearanceSettings = pensionAppearanceSettings(pension);
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
      <div className="admin-shell flex min-h-full flex-1 flex-col">
        <div className="admin-hud">
          <div className="admin-hud__surface">
            <AdminTopBar board={todayBoard} cereriCount={cereriCount} />
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

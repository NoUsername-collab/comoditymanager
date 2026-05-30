import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import "@/app/admin/admin-features.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SimOverlay } from "@/components/admin/SimOverlay";
import { countCereriNoi } from "@/services/bookings";
import type { ThemeSettings } from "@/lib/themes";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { resolveStaffRole } from "@/lib/auth/tenant-staff";
import { getStaffUser } from "@/lib/auth/require-staff";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";
import { getSimStatus } from "@/domain/simulation/sim-cookie";
import { todayReal } from "@/domain/simulation/sim-clock";
import { isSimBackupPresent } from "@/services/simulation";
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
  const t = await getTranslations("admin.layout");
  // Simulation state
  const simStatus = await getSimStatus();
  const simDbBackup =
    simStatus.active ? await isSimBackupPresent().catch(() => false) : true;

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
  let isAdmin = false;

  try {
    const user = await getStaffUser();
    const role = user ? await resolveStaffRole(user) : null;
    isAdmin = role === "admin";
    locationUnlocked = await isAdminLocationUnlocked();
  } catch {
    /* proxy redirects if unauthenticated */
  }

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <div className="admin-shell flex min-h-full flex-1 flex-col">
        <div className="admin-hud">
          <div className="admin-hud__surface">
            <AdminTopBar
              board={todayBoard}
              cereriCount={cereriCount}
              locationUnlocked={locationUnlocked}
              isAdmin={isAdmin}
              simActive={simStatus.active}
              simDate={simStatus.active ? simStatus.currentDate : null}
              simDays={simStatus.active ? simStatus.daysAdvanced : 0}
            />
          </div>
        </div>

        {cereriCount > 0 && (
          <div className="admin-hud-alert px-6 py-2.5 text-center text-sm">
            <Link href="/admin/bookings" className="admin-hud-alert__link">
              {t("pendingCount", { count: cereriCount })}
            </Link>{" "}
            {t("pendingSuffix")}
          </div>
        )}

        <AdminShellClient>
          <div className="admin-page-main flex-1">{children}</div>
        </AdminShellClient>

        <SimOverlay
          active={simStatus.active}
          currentDate={simStatus.active ? simStatus.currentDate : null}
          daysAdvanced={simStatus.active ? simStatus.daysAdvanced : 0}
          realDate={todayReal()}
          dbBackupActive={simDbBackup}
        />
      </div>
    </AdminAppearanceProvider>
  );
}


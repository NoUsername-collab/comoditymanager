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
import { isLocationConfigurationAccessible } from "@/lib/auth/location-unlock";
import { getSimStatus } from "@/domain/simulation/sim-cookie";
import { todayReal } from "@/domain/simulation/sim-clock";
import { isSimBackupPresent } from "@/services/simulation";
import { loadTodayBoard } from "@/services/today-board";
import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { OnboardingBar } from "@/components/admin/onboarding/OnboardingBar";
import { AdminMobileBottomNav } from "@/layout/components/AdminMobileBottomNav";
import { MobileShell } from "@/layout/components/MobileShell";

const DEFAULT_APPEARANCE: ThemeSettings = {
  theme: "default",
  mode: "night",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, t, simBundle, batch, todayBoard] = await Promise.all([
    bindTenantContextFromRequest(),
    getTranslations("admin.layout"),
    (async () => {
      const simStatus = await getSimStatus();
      const simDbBackup = simStatus.active
        ? await isSimBackupPresent().catch(() => false)
        : true;
      return { simStatus, simDbBackup };
    })(),
    Promise.all([
      countCereriNoi().catch(() => 0),
      getPensionSettings().catch(() => null),
      (async () => {
        try {
          const user = await getStaffUser();
          const role = user ? await resolveStaffRole(user) : null;
          const locationUnlocked = user
            ? await isLocationConfigurationAccessible(user.id)
            : false;
          return {
            isAdmin: role === "admin",
            locationUnlocked,
          };
        } catch {
          return { isAdmin: false, locationUnlocked: false };
        }
      })(),
    ]),
    getPensionSettings()
      .catch(() => null)
      .then((pension) => {
        const checkInTime = pension?.default_check_in_time ?? "14:00";
        const checkOutTime = pension?.default_check_out_time ?? "11:00";
        return loadTodayBoard(checkInTime, checkOutTime).catch(() => null);
      }),
  ]);

  const { simStatus, simDbBackup } = simBundle;
  const [cereriCount, pension, staffAccess] = batch;
  const checkInTime = pension?.default_check_in_time ?? "14:00";
  const checkOutTime = pension?.default_check_out_time ?? "11:00";
  const { isAdmin, locationUnlocked } = staffAccess;

  let appearanceSettings: ThemeSettings = DEFAULT_APPEARANCE;
  if (pension) {
    appearanceSettings = pensionAppearanceSettings(pension);
  }

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <MobileShell surface="admin" className="admin-shell flex min-h-full flex-1 flex-col">
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

        <OnboardingBar />

        {cereriCount > 0 && (
          <div className="admin-hud-alert px-6 py-1.5 text-center text-xs">
            <Link href="/admin/bookings" className="admin-hud-alert__link">
              {t("pendingCount", { count: cereriCount })}
            </Link>{" "}
            {t("pendingSuffix")}
          </div>
        )}

        <AdminShellClient>
          <div className="admin-page-main ml-main flex-1">{children}</div>
        </AdminShellClient>

        <AdminMobileBottomNav
          cereriCount={cereriCount}
          locationUnlocked={locationUnlocked}
        />

        <SimOverlay
          active={simStatus.active}
          currentDate={simStatus.active ? simStatus.currentDate : null}
          daysAdvanced={simStatus.active ? simStatus.daysAdvanced : 0}
          realDate={todayReal()}
          dbBackupActive={simDbBackup}
        />
      </MobileShell>
    </AdminAppearanceProvider>
  );
}


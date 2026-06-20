import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import "@/app/admin/admin-features.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { SimOverlay } from "@/components/admin/SimOverlay";
import { countCereriNoi } from "@/services/bookings";
import type { ThemeSettings } from "@/lib/themes";
import { getStaffShellAccess, requireStaff } from "@/lib/auth/require-staff";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import {
  getPensionSettings,
  pensionAppearanceSettings,
  pensionStatisticsVisibility,
  pensionTeamPermissions,
} from "@/services/pension-settings";
import { canStaffPermission } from "@/domain/settings/team-permissions";
import { getSimStatus } from "@/domain/simulation/sim-cookie";
import { todayReal } from "@/domain/simulation/sim-clock";
import { isSimBackupPresent } from "@/services/simulation";
import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { OnboardingBar } from "@/components/admin/onboarding/OnboardingBar";
import { MfaSecurityReminder } from "@/components/admin/settings/MfaSecurityReminder";
import { AdminMobileBottomNav } from "@/layout/components/AdminMobileBottomNav";
import { MobileShell } from "@/layout/components/MobileShell";

const DEFAULT_APPEARANCE: ThemeSettings = {
  theme: "noir",
  mode: "night",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [staff, , t, simBundle, shellData] = await Promise.all([
    requireStaff(),
    bindTenantContextFromRequest(),
    getTranslations("admin.layout"),
    (async () => {
      const simStatus = await getSimStatus();
      const simDbBackup = simStatus.active
        ? await isSimBackupPresent().catch(() => false)
        : true;
      return { simStatus, simDbBackup };
    })(),
    (async () => {
      const pensionPromise = getPensionSettings().catch(() => null);
      const [pension, cereriCount, staffAccess] = await Promise.all([
        pensionPromise,
        countCereriNoi().catch(() => 0),
        getStaffShellAccess().catch(() => ({
          isAdmin: false,
          locationUnlocked: false,
        })),
      ]);
      return { cereriCount, pension, staffAccess };
    })(),
  ]);

  const { simStatus, simDbBackup } = simBundle;
  const { cereriCount, pension, staffAccess } = shellData;
  const checkInTime = pension?.default_check_in_time ?? "14:00";
  const checkOutTime = pension?.default_check_out_time ?? "11:00";
  const { isAdmin, locationUnlocked } = staffAccess;
  const teamPermissions = pensionTeamPermissions(pension);
  const statisticsAccess =
    canStaffPermission(staff.memberRole, "reports_tools", teamPermissions) &&
    canAccessStatistics(staff.memberRole, pensionStatisticsVisibility(pension));

  let appearanceSettings: ThemeSettings = DEFAULT_APPEARANCE;
  if (pension) {
    appearanceSettings = pensionAppearanceSettings(pension);
  }

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <MobileShell surface="admin" className="admin-shell flex min-h-full flex-1 flex-col">
        <AdminMobileBottomNav
          cereriCount={cereriCount}
          locationUnlocked={locationUnlocked}
          statisticsAccess={statisticsAccess}
        />

        <div className="admin-hud">
          <div className="admin-hud__surface">
            <AdminTopBar
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

        <MfaSecurityReminder
          email={staff.user.email}
          memberRole={staff.memberRole}
        />

        {cereriCount > 0 && (
          <div className="admin-hud-alert px-4 py-1.5 text-center text-xs">
            <Link href="/admin/cazari?view=cereri" className="admin-hud-alert__link">
              {t("pendingCount", { count: cereriCount })}
            </Link>{" "}
            {t("pendingSuffix")}
          </div>
        )}

        <AdminShellClient>
          <div className="admin-page-main ml-main flex-1">{children}</div>
        </AdminShellClient>

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


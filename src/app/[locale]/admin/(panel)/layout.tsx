import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "@/app/admin/admin-features.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminTopBarWithSetupIssues } from "@/components/admin/AdminTopBarWithSetupIssues";
import { SimOverlay } from "@/components/admin/SimOverlay";
import { loadAdminShellContext } from "@/lib/admin/shell-context";
import { getSimStatus } from "@/domain/simulation/sim-cookie";
import { todayReal } from "@/domain/simulation/sim-clock";
import { isSimBackupPresent } from "@/services/simulation";
import { OnboardingBarLazy } from "@/components/admin/onboarding/OnboardingBarLazy";
import { AdminMobileBottomNavWithSetupIssues } from "@/layout/components/AdminMobileBottomNavWithSetupIssues";
import { MobileShell } from "@/layout/components/MobileShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shell, t, simBundle] = await Promise.all([
    loadAdminShellContext(),
    getTranslations("admin.layout"),
    (async () => {
      const simStatus = await getSimStatus();
      const simDbBackup = simStatus.active
        ? await isSimBackupPresent().catch(() => false)
        : true;
      return { simStatus, simDbBackup };
    })(),
  ]);

  const { simStatus, simDbBackup } = simBundle;
  const {
    staff,
    cereriCount,
    isAdmin,
    locationUnlocked,
    statisticsAccess,
    appearanceSettings,
  } = shell;

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <MobileShell surface="admin" className="admin-shell flex min-h-full flex-1 flex-col">
        <div className="admin-hud">
          <div className="admin-hud__surface">
            <AdminTopBarWithSetupIssues
              cereriCount={cereriCount}
              locationUnlocked={locationUnlocked}
              isAdmin={isAdmin}
              simActive={simStatus.active}
              simDate={simStatus.active ? simStatus.currentDate : null}
              simDays={simStatus.active ? simStatus.daysAdvanced : 0}
              staffEmail={staff.user.email}
              memberRole={staff.memberRole}
            />
          </div>
        </div>

        <Suspense fallback={null}>
          <OnboardingBarLazy />
        </Suspense>

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

        <AdminMobileBottomNavWithSetupIssues
          cereriCount={cereriCount}
          locationUnlocked={locationUnlocked}
          statisticsAccess={statisticsAccess}
          staffEmail={staff.user.email}
          memberRole={staff.memberRole}
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

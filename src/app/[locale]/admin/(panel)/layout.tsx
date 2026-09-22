import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import "@/styles/features/admin/admin-features.css";
import "@/styles/admin/shell.css";
import "@/styles/features/layout/mobile-core.css";
import "@/styles/features/layout/mobile-admin.css";
import { AdminShellClient } from "@/components/admin/AdminShellClient";

import { AdminAppearanceProvider } from "@/components/admin/AdminAppearanceProvider";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { loadAdminShellContext } from "@/lib/admin/shell-context";
import { OnboardingBarLazy } from "@/features/onboarding/ui/OnboardingBarLazy";
import { AdminMobileBottomNav } from "@/layout/components/AdminMobileBottomNav";
import { MobileShell } from "@/layout/components/MobileShell";
import { PwaInstallBanner } from "@/components/pwa/PwaInstallBanner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shell, t] = await Promise.all([
    loadAdminShellContext(),
    getTranslations("admin.layout"),
  ]);

  const {
    requestCount,
    locationUnlocked,
    statisticsAccess,
    appearanceSettings,
  } = shell;

  return (
    <AdminAppearanceProvider initialSettings={appearanceSettings}>
      <MobileShell surface="admin" className="admin-shell flex min-h-full flex-1 flex-col">
        <div className="admin-hud">
          <div className="admin-hud__surface">
            <AdminTopBar
              requestCount={requestCount}
              locationUnlocked={locationUnlocked}
            />
          </div>
        </div>

        <Suspense fallback={null}>
          <OnboardingBarLazy />
        </Suspense>

        {requestCount > 0 && (
          <div className="admin-hud-alert px-4 py-1.5 text-center text-xs">
            <Link href="/admin/cazari?view=cereri" className="admin-hud-alert__link">
              {t("pendingCount", { count: requestCount })}
            </Link>{" "}
            {t("pendingSuffix")}
          </div>
        )}

        <AdminShellClient>
          <div className="admin-page-main ml-main flex-1">{children}</div>
        </AdminShellClient>

        <AdminMobileBottomNav
          requestCount={requestCount}
          locationUnlocked={locationUnlocked}
          statisticsAccess={statisticsAccess}
        />

        <PwaInstallBanner />
      </MobileShell>
    </AdminAppearanceProvider>
  );
}

import { Link } from "@/i18n/navigation";
import { AdminTodayBar } from "@/components/admin/AdminTodayBar";
import { AdminDayNightSwitch } from "@/components/admin/AdminDayNightSwitch";
import { AdminLiveRefresh } from "@/components/admin/AdminLiveRefresh";
import { AdminVersionBadge } from "@/components/admin/AdminVersionBadge";
import { AdminPlanBadge } from "@/components/admin/AdminPlanBadge";
import { HudIconGlobe } from "@/components/admin/AdminHudIcons";
import { LogoutButton } from "@/app/[locale]/admin/(panel)/logout-button";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { AdminNav } from "@/components/admin/AdminNav";
import { SimTriggerChip } from "@/components/admin/SimTriggerChip";
import { AdminGearMenu } from "@/components/admin/AdminGearMenu";
import type { TodayBoard } from "@/services/today-board";
import { getTranslations } from "next-intl/server";
import { getTenantContext } from "@/core/tenant/context";

export async function AdminTopBar({
  board,
  cereriCount,
  locationUnlocked = false,
  isAdmin = false,
  simActive = false,
  simDate,
  simDays,
}: {
  board: TodayBoard | null;
  cereriCount: number;
  locationUnlocked?: boolean;
  isAdmin?: boolean;
  simActive?: boolean;
  simDate?: string | null;
  simDays?: number;
}) {
  const t = await getTranslations("admin.shell");

  let pensionName = t("brandFallback");
  try {
    const ctx = getTenantContext();
    pensionName = ctx.tenant.displayName;
  } catch {
    // Tenant context not bound yet — use fallback
  }

  return (
    <header className="admin-hud__header">
      {/* ── Left: pension name + plan badge ── */}
      <div className="admin-hud__brand">
        <div className="admin-hud__logo" aria-hidden>
          <span className="admin-hud__logo-inner">HO</span>
        </div>
        <div className="admin-hud__brand-text">
          <h1 className="admin-hud__title">{pensionName}</h1>
          <AdminPlanBadge />
        </div>
      </div>

      {/* ── Center: navigation ── */}
      <div className="admin-hud__center">
        <AdminNav cereriCount={cereriCount} locationUnlocked={locationUnlocked} />
      </div>

      {/* ── Right: today bar, theme, version, gear ── */}
      <div className="admin-hud__right">
        <AdminTodayBar
          cereriCount={cereriCount}
          arrivalsCount={board?.arrivals.length ?? 0}
          departuresCount={board?.departures.length ?? 0}
          cleanCount={board?.roomsToClean.length ?? 0}
        />
        <div className="admin-hud__tools">
          <AdminDayNightSwitch />
          <AdminVersionBadge />
          <AdminGearMenu>
            <div className="admin-gear__item" role="menuitem">
              <AdminLiveRefresh />
            </div>
            {isAdmin && (
              <div className="admin-gear__item" role="menuitem">
                <SimTriggerChip simActive={simActive} simDate={simDate} simDays={simDays} />
              </div>
            )}
            <div className="admin-gear__sep" />
            <Link
              href="/calendar"
              className="admin-gear__item admin-gear__item--link"
              role="menuitem"
            >
              <HudIconGlobe className="admin-gear__item-icon" />
              <span>{t("publicSite")}</span>
            </Link>
            <div className="admin-gear__item" role="menuitem">
              <LanguageSwitcher />
            </div>
            <div className="admin-gear__sep" />
            <div className="admin-gear__item" role="menuitem">
              <LogoutButton />
            </div>
          </AdminGearMenu>
        </div>
      </div>
    </header>
  );
}

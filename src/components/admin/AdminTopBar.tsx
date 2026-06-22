import { Link } from "@/i18n/navigation";
import { AdminDayNightSwitch } from "@/components/admin/AdminDayNightSwitch";
import { AdminVersionBadge } from "@/components/admin/AdminVersionBadge";
import { AdminPlanBadge } from "@/components/admin/AdminPlanBadge";
import { HudIconGear, HudIconGlobe } from "@/components/admin/AdminHudIcons";
import { LogoutButton } from "@/app/[locale]/admin/(panel)/logout-button";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { AdminNav } from "@/components/admin/AdminNav";
import { SimTriggerChip } from "@/components/admin/SimTriggerChip";
import { AdminGearMenu } from "@/components/admin/AdminGearMenu";
import { PwaInstallAction } from "@/components/pwa/PwaInstallAction";
import { getTranslations } from "next-intl/server";
import { getTenantContext } from "@/core/tenant/context";

export async function AdminTopBar({
  cereriCount,
  locationUnlocked = false,
  isAdmin = false,
  simActive = false,
  simDate,
  simDays,
  hasSetupIssues = false,
}: {
  cereriCount: number;
  locationUnlocked?: boolean;
  isAdmin?: boolean;
  simActive?: boolean;
  simDate?: string | null;
  simDays?: number;
  hasSetupIssues?: boolean;
}) {
  const t = await getTranslations("admin.shell");
  const tCommon = await getTranslations("common");

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
        <div className="admin-hud__brand-text">
          <h1 className="admin-hud__title">{pensionName}</h1>
          <AdminPlanBadge />
        </div>
      </div>

      {/* ── Center: navigation ── */}
      <div className="admin-hud__center">
        <AdminNav cereriCount={cereriCount} locationUnlocked={locationUnlocked} />
      </div>

      {/* ── Right: theme, version, gear ── */}
      <div className="admin-hud__right">
        <div className="admin-hud__tools">
          <AdminDayNightSwitch />
          <AdminVersionBadge />
          <AdminGearMenu hasUnresolvedIssues={hasSetupIssues}>
            <Link
              href="/admin/settings"
              className="admin-gear__item admin-gear__item--link"
              role="menuitem"
            >
              <HudIconGear className="admin-gear__item-icon" />
              <span>{t("settings")}</span>
            </Link>
            <Link
              href="/calendar"
              className="admin-gear__item admin-gear__item--link"
              role="menuitem"
            >
              <HudIconGlobe className="admin-gear__item-icon" />
              <span>{t("publicSite")}</span>
            </Link>
            <PwaInstallAction variant="gear" />
            <div className="admin-gear__item admin-gear__item--logout" role="menuitem">
              <LogoutButton />
            </div>
            <div className="admin-gear__sep" />
            <div className="admin-gear__footer">
              <div className="admin-gear__footer-lang">
                <span className="admin-gear__footer-label">{tCommon("language")}</span>
                <LanguageSwitcher compact variant="inline" />
              </div>
              {isAdmin ? (
                <SimTriggerChip
                  compact
                  simActive={simActive}
                  simDate={simDate}
                  simDays={simDays}
                />
              ) : null}
            </div>
          </AdminGearMenu>
        </div>
      </div>
    </header>
  );
}

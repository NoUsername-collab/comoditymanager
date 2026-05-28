import { Link } from "@/i18n/navigation";
import { AdminTodayNotifications } from "@/components/admin/AdminTodayNotifications";
import { AdminDayNightSwitch } from "@/components/admin/AdminDayNightSwitch";
import { AdminLiveRefresh } from "@/components/admin/AdminLiveRefresh";
import { AdminVersionBadge } from "@/components/admin/AdminVersionBadge";
import { HudIconGlobe } from "@/components/admin/AdminHudIcons";
import { LogoutButton } from "@/app/[locale]/admin/(panel)/logout-button";
import { LanguageSwitcher } from "@/components/public/LanguageSwitcher";
import { AdminNav } from "@/components/admin/AdminNav";
import { SimTriggerChip } from "@/components/admin/SimTriggerChip";
import type { TodayBoard } from "@/services/today-board";
import { getTranslations } from "next-intl/server";

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

  return (
    <header className="admin-hud__header">
      <div className="admin-hud__brand">
        <div className="admin-hud__logo" aria-hidden>
          <span className="admin-hud__logo-inner">HO</span>
        </div>
        <div className="admin-hud__brand-text">
          <p className="admin-hud__eyebrow">{t("eyebrow")}</p>
          <h1 className="admin-hud__title">{t("title")}</h1>
        </div>
      </div>

      <div className="admin-hud__center">
        <AdminNav cereriCount={cereriCount} locationUnlocked={locationUnlocked} />
      </div>

      <div className="admin-hud__right">
        <AdminTodayNotifications board={board} cereriCount={cereriCount} />
        <div className="admin-hud__tools">
          <AdminDayNightSwitch />
          <AdminLiveRefresh />
          <AdminVersionBadge />
          <LanguageSwitcher />
          {isAdmin && <SimTriggerChip simActive={simActive} simDate={simDate} simDays={simDays} />}
          <Link href="/calendar" className="admin-hud__chip admin-hud__chip--ghost">
            <HudIconGlobe className="h-3.5 w-3.5 shrink-0 opacity-90" />
            <span className="admin-hud__chip-label-text">{t("publicSite")}</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

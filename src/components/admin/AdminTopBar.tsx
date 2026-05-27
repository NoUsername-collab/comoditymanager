import Link from "next/link";
import { AdminTodayNotifications } from "@/components/admin/AdminTodayNotifications";
import { AdminDayNightSwitch } from "@/components/admin/AdminDayNightSwitch";
import { AdminLiveRefresh } from "@/components/admin/AdminLiveRefresh";
import { AdminVersionBadge } from "@/components/admin/AdminVersionBadge";
import { HudIconGlobe } from "@/components/admin/AdminHudIcons";
import { LogoutButton } from "@/app/admin/(panel)/logout-button";
import type { TodayBoard } from "@/services/today-board";

export function AdminTopBar({
  board,
  cereriCount,
}: {
  board: TodayBoard | null;
  cereriCount: number;
}) {
  return (
    <header className="admin-hud__header">
      <div className="admin-hud__brand">
        <div className="admin-hud__logo" aria-hidden>
          <span className="admin-hud__logo-inner">HO</span>
        </div>
        <div className="admin-hud__brand-text">
          <p className="admin-hud__eyebrow">Hospira · Control</p>
          <h1 className="admin-hud__title">Panou administrare</h1>
        </div>
      </div>

      <div className="admin-hud__center">
        <AdminTodayNotifications board={board} cereriCount={cereriCount} />
      </div>

      <div className="admin-hud__actions">
        <div className="admin-hud__action-cluster admin-hud__action-cluster--status">
          <AdminDayNightSwitch />
          <AdminVersionBadge />
          <AdminLiveRefresh />
        </div>

        <div className="admin-hud__action-cluster admin-hud__action-cluster--links">
          <Link href="/calendar" className="admin-hud__chip admin-hud__chip--ghost">
            <HudIconGlobe className="h-4 w-4 shrink-0 opacity-90" />
            Site public
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

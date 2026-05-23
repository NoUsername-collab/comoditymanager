import Link from "next/link";
import { AdminDayNightSwitch } from "@/components/admin/AdminDayNightSwitch";
import { AdminLiveRefresh } from "@/components/admin/AdminLiveRefresh";
import { AdminVersionBadge } from "@/components/admin/AdminVersionBadge";
import { HudIconGlobe } from "@/components/admin/AdminHudIcons";
import { LogoutButton } from "@/app/admin/(panel)/logout-button";

export function AdminTopBar() {
  return (
    <header className="admin-hud__header">
      <div className="admin-hud__brand">
        <div className="admin-hud__logo" aria-hidden>
          <span className="admin-hud__logo-inner">CE</span>
        </div>
        <div className="admin-hud__brand-text">
          <p className="admin-hud__eyebrow">Casa Emil · Control</p>
          <h1 className="admin-hud__title">Panou administrare</h1>
        </div>
      </div>

      <div className="admin-hud__actions">
        <AdminDayNightSwitch />
        <AdminVersionBadge />
        <AdminLiveRefresh />
        <Link href="/calendar" className="admin-hud__chip admin-hud__chip--ghost">
          <HudIconGlobe className="h-4 w-4 shrink-0 opacity-90" />
          Site public
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}

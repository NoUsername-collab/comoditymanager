"use client";

import { logoutAction } from "@/app/admin/login/actions";
import { HudIconLogout } from "@/components/admin/AdminHudIcons";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";

export function LogoutButton() {
  return (
    <AdminPendingForm action={logoutAction}>
      <button type="submit" className="admin-hud__chip admin-hud__chip--logout">
        <HudIconLogout className="h-4 w-4 shrink-0" />
        Deconectare
      </button>
    </AdminPendingForm>
  );
}

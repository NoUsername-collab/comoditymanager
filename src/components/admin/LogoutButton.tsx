"use client";

import { logoutAction } from "@/features/auth/login";
import { HudIconLogout } from "@/components/admin/AdminHudIcons";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { useTranslations } from "next-intl";

export function LogoutButton() {
  const t = useTranslations("admin");

  return (
    <AdminPendingForm action={logoutAction}>
      <button type="submit" className="admin-hud__chip admin-hud__chip--logout">
        <HudIconLogout className="h-4 w-4 shrink-0" />
        {t("logout")}
      </button>
    </AdminPendingForm>
  );
}

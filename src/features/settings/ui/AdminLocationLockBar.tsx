import { getTranslations } from "next-intl/server";
import { getAdminLocationUnlockUntilMs } from "@/lib/auth/admin-config-session";
import { loadSettingsStaffContext } from "@/lib/settings/page-context";
import { AdminLocationLockButton } from "@/features/settings/ui/AdminLocationUnlockForm";

/** Lacăt sesiune locație — doar admin angajat (nu owner). */
export async function AdminLocationLockBar() {
  const t = await getTranslations("admin.pages.settingsLocation.unlock");
  const { staff, hasTeam } = await loadSettingsStaffContext();
  const isOwner = staff.memberRole === "owner";

  if (isOwner) {
    // An owner working alone has nobody to open or close access for.
    return hasTeam ? <p className="admin-settings-hint max-w-xl">{t("ownerLockHint")}</p> : null;
  }

  const untilMs = await getAdminLocationUnlockUntilMs();
  if (!untilMs) return null;

  const expiresAt = new Date(untilMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="admin-location-lock-bar flex flex-wrap items-center gap-3">
      <p className="settings-alerts__item settings-alerts__item--warning mb-0">
        {t("sessionActive", { time: expiresAt })}
      </p>
      <AdminLocationLockButton />
    </div>
  );
}

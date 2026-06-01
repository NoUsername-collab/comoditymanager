import { getTranslations } from "next-intl/server";
import { getAdminLocationUnlockUntilMs } from "@/lib/auth/admin-config-session";
import { requireStaff } from "@/lib/auth/require-staff";
import { AdminLocationLockButton } from "@/components/admin/settings/AdminLocationUnlockForm";

/** Lacăt sesiune locație — doar admin angajat (nu owner). */
export async function AdminLocationLockBar() {
  const t = await getTranslations("admin.pages.settingsLocation.unlock");
  const { memberRole } = await requireStaff();
  const isOwner = memberRole === "owner";

  if (isOwner) {
    return (
      <p className="max-w-xl text-xs text-zinc-500">{t("ownerLockHint")}</p>
    );
  }

  const untilMs = await getAdminLocationUnlockUntilMs();
  if (!untilMs) return null;

  const expiresAt = new Date(untilMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
        {t("sessionActive", { time: expiresAt })}
      </span>
      <AdminLocationLockButton />
    </div>
  );
}

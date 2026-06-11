import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { GuestAppSettingsForm } from "@/components/admin/settings/GuestAppSettingsForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { requireStaff } from "@/lib/auth/require-staff";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { ensureGuestAppSettingsRow } from "@/services/guest-app/mutations";
import { getLocale, getTranslations } from "next-intl/server";

export default async function GuestAppSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, staff, tenant] = await Promise.all([
    getTranslations("admin.pages.guestApp"),
    searchParams,
    requireStaff(),
    resolveRequestTenant(),
  ]);

  if (!tenant) {
    return (
      <AdminRetroPageFrame title={t("title")}>
        <p className="text-red-600">{t("loadError")}</p>
      </AdminRetroPageFrame>
    );
  }

  const settings = await ensureGuestAppSettingsRow(tenant.id).catch(() => null);
  const canEdit = staff.memberRole === "owner" || staff.role === "admin";

  return (
    <AdminRetroPageFrame
      title={t("title")}
      description={t("description")}
      className="admin-settings-page w-full max-w-none"
    >
      <div className="mb-4">
        <Link
          href="/admin/settings"
          className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
        >
          ← {t("backSettings")}
        </Link>
      </div>

      {params.saved === "1" ? (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t("saved")}
        </p>
      ) : null}

      {!settings ? (
        <p className="text-red-600">{t("loadError")}</p>
      ) : !canEdit ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("readOnly")}
        </p>
      ) : (
        <Suspense fallback={<p>{t("loading")}</p>}>
          <GuestAppSettingsForm settings={settings} />
        </Suspense>
      )}
    </AdminRetroPageFrame>
  );
}

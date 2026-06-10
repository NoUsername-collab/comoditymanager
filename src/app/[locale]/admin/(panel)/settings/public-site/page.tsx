import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { PublicSiteSettingsForm } from "@/components/admin/settings/PublicSiteSettingsForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { requireStaff } from "@/lib/auth/require-staff";
import { getPublicSiteConfigForAdmin } from "@/services/public-site/queries";
import { getLocale, getTranslations } from "next-intl/server";

export default async function PublicSiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [t, params, locale, staff, config] = await Promise.all([
    getTranslations("admin.pages.publicSite"),
    searchParams,
    getLocale(),
    requireStaff(),
    getPublicSiteConfigForAdmin().catch(() => null),
  ]);

  if (!config) {
    return (
      <AdminRetroPageFrame title={t("title")}>
        <p className="text-red-600">{t("loadError")}</p>
      </AdminRetroPageFrame>
    );
  }

  const canEdit = staff.memberRole === "owner" || staff.role === "admin";

  return (
    <AdminRetroPageFrame
      title={t("title")}
      description={t("description")}
      className="admin-settings-page w-full max-w-none"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/admin/settings" className="text-sm font-semibold text-zinc-600 hover:text-zinc-900">
          ← {t("backSettings")}
        </Link>
        <Link
          href="/"
          target="_blank"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          {t("previewSite")}
        </Link>
      </div>

      {params.saved === "1" ? (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t("saved")}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("readOnly")}
        </p>
      ) : (
        <Suspense fallback={<p>{t("loading")}</p>}>
          <PublicSiteSettingsForm config={config} locale={locale} />
        </Suspense>
      )}
    </AdminRetroPageFrame>
  );
}

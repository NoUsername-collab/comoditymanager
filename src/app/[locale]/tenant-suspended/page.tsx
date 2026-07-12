import { getTranslations } from "next-intl/server";
import { normalizeTenantLifecycleStatus } from "@/domain/tenant/operational";
import { Link } from "@/i18n/navigation";

export default async function TenantSuspendedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [t, params] = await Promise.all([
    getTranslations("tenantSuspended"),
    searchParams,
  ]);
  const status = normalizeTenantLifecycleStatus(params.status);
  const isCancelled = status === "cancelled";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 p-4 text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          {isCancelled ? t("cancelledTitle") : t("suspendedTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          {isCancelled ? t("cancelledLead") : t("suspendedLead")}
        </p>
        <p className="mt-4 text-sm text-neutral-500">{t("supportHint")}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-700 px-4 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
          >
            {t("staffLogin")}
          </Link>
          <a
            href="mailto:support@zalmox.app"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            {t("contactSupport")}
          </a>
        </div>
      </div>
    </main>
  );
}

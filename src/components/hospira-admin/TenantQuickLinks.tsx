"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TenantImpersonateLink } from "@/components/hospira-admin/TenantImpersonateLink";

export function TenantQuickLinks({
  tenantId,
  slug,
}: {
  tenantId: string;
  slug: string;
}) {
  const t = useTranslations("hospiraAdmin.tenantDetail.quickLinks");

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <h2 className="text-sm font-semibold uppercase text-neutral-500">
        {t("title")}
      </h2>
      <TenantImpersonateLink slug={slug} />
      <Link
        href={`/hospira-admin/logs?tenant=${tenantId}`}
        className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] w-full items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 sm:w-auto"
      >
        {t("viewLogs")} →
      </Link>
    </div>
  );
}

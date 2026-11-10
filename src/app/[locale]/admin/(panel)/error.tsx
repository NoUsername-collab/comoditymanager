"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { reportTenantClientError } from "@/lib/tenant/report-client-error";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("admin.panelError");
  useEffect(() => {
    reportTenantClientError(error, "admin-panel");
  }, [error]);

  return (
    <div className="ml-content flex min-h-[40dvh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-base font-bold text-zinc-900">{t("title")}</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-600">{t("text")}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-[2.75rem] rounded-lg bg-zinc-900 px-4 py-2 text-base font-semibold text-white"
        >
          {t("retry")}
        </button>
        <Link
          href="/admin"
          className="min-h-[2.75rem] rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base font-semibold text-zinc-800"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}

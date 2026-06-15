"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isHospiraAdminDbError } from "@/lib/hospira-admin/format-db-error";

export default function HospiraLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("hospiraAdmin.error");
  const logsT = useTranslations("hospiraAdmin.logs.error");

  useEffect(() => {
    console.error("[hospira-admin/logs]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      ...(isHospiraAdminDbError(error)
        ? {
            context: error.context,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : {}),
    });
  }, [error]);

  return (
    <div className="hospira-admin-error flex min-h-[min(50dvh,28rem)] items-center justify-center px-4 py-5">
      <div className="hospira-admin-error__card max-w-2xl rounded-lg border border-red-900 bg-red-950/30 p-4 text-center">
        <p className="text-lg font-semibold text-red-300">{logsT("title")}</p>
        <p className="mt-2 text-sm text-red-200/80">{logsT("hint")}</p>
        <p className="mt-2 text-sm text-red-300/90">
          {t("fallback")}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-neutral-500">
            {t("code", { digest: error.digest })}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t("retry")}
          </button>
          <Link
            href="/hospira-admin/logs#dev-logs"
            className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center justify-center rounded-md border border-amber-800 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/50"
          >
            {logsT("viewDevLogs")}
          </Link>
          <Link
            href="/hospira-admin"
            className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { exportTenantsCsvAction } from "@/features/platform-admin/tools-actions";

export function TenantCsvExportButton() {
  const t = useTranslations("platformAdmin.tenants");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await exportTenantsCsvAction();
      if (!result.success || !result.data) {
        setMessage(result.error ?? t("exportFailed"));
        return;
      }

      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(t("exportSuccess"));
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={pending}
        className="inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? t("exporting") : t("exportCsv")}
      </button>
      {message && (
        <span className="text-xs text-neutral-400" role="status">
          {message}
        </span>
      )}
    </div>
  );
}

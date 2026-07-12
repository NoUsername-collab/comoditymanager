"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { probePlatformLogsErrorAction } from "@/app/[locale]/platform-admin/(panel)/actions/logs-actions";
import { Link } from "@/i18n/navigation";

export function LogsProbeButton() {
  const t = useTranslations("platformAdmin.logsPage.probe");
  const [pending, startTransition] = useTransition();
  const [probeResult, setProbeResult] = useState<{
    ok: boolean;
    message: string;
    logWritten?: boolean;
  } | null>(null);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/platform-admin/logs?throw=page"
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-900/50"
          title={t("pageThrowTitle")}
        >
          {t("pageThrow")}
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setProbeResult(null);
            startTransition(async () => {
              try {
                await probePlatformLogsErrorAction();
                setProbeResult({
                  ok: false,
                  message:
                    "Probe returned without throwing — unexpected behavior.",
                });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);
                console.error("[platform-logs-probe]", error);
                setProbeResult({
                  ok: true,
                  logWritten: true,
                  message,
                });
              }
            });
          }}
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/50 disabled:opacity-60"
          title={t("actionTitle")}
        >
          {pending ? t("actionPending") : t("actionThrow")}
        </button>
      </div>
      {probeResult && (
        <div
          role="status"
          className={`max-w-xl rounded-md border px-3 py-2 text-left text-xs ${
            probeResult.ok
              ? "border-emerald-800 bg-emerald-950/40 text-emerald-200"
              : "border-red-800 bg-red-950/40 text-red-200"
          }`}
        >
          {probeResult.ok && probeResult.logWritten && (
            <p className="mb-2 font-sans text-sm text-emerald-100">
              {t("loggedMessage")}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words font-mono">
            {probeResult.message}
          </p>
          {probeResult.ok && probeResult.logWritten && (
            <Link
              href="/platform-admin/logs#dev-logs"
              className="mt-2 inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-emerald-700/60 bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-900/50"
            >
              {t("viewDevLogs")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

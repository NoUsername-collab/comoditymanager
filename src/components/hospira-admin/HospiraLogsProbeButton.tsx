"use client";

import { useState, useTransition } from "react";
import { probeHospiraLogsErrorAction } from "@/app/[locale]/hospira-admin/(panel)/actions/logs-actions";
import { Link } from "@/i18n/navigation";

export function HospiraLogsProbeButton() {
  const [pending, startTransition] = useTransition();
  const [probeResult, setProbeResult] = useState<{
    ok: boolean;
    message: string;
    stack?: string;
    logWritten?: boolean;
  } | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/hospira-admin/logs?throw=page"
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-200 hover:bg-red-900/50"
          title="Aruncă în SSR; eroarea apare în dev_logs și în error boundary"
        >
          Test aruncare pagină (SSR)
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setProbeResult(null);
            startTransition(async () => {
              try {
                await probeHospiraLogsErrorAction();
                setProbeResult({
                  ok: false,
                  message:
                    "Probe-ul a returnat fără aruncare — comportament neașteptat.",
                });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : String(error);
                const stack =
                  error instanceof Error ? error.stack ?? undefined : undefined;
                console.error("[hospira-logs-probe]", { message, stack });
                setProbeResult({
                  ok: true,
                  logWritten: true,
                  message,
                  stack,
                });
              }
            });
          }}
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/50 disabled:opacity-60"
          title="Scrie în dev_logs apoi aruncă eroare (server action)"
        >
          {pending ? "Se testează…" : "Test aruncare acțiune"}
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
              Eroarea de test a fost aruncată și înregistrată în{" "}
              <strong>dev_logs</strong>.
            </p>
          )}
          <p className="whitespace-pre-wrap break-words font-mono">
            {probeResult.message}
          </p>
          {probeResult.stack && (
            <pre className="mt-2 max-h-32 overflow-auto font-mono text-[10px] leading-relaxed opacity-80">
              {probeResult.stack}
            </pre>
          )}
          {probeResult.ok && probeResult.logWritten && (
            <Link
              href="/hospira-admin/logs#dev-logs"
              className="mt-2 inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-emerald-700/60 bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-900/50"
            >
              Vezi dev_logs ↓
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

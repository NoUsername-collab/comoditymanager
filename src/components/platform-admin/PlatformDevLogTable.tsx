"use client";

import { useMemo, useState } from "react";
import { DEV_LEVEL_COLOR } from "@/lib/platform-admin/log-styles";
import type { PlatformDevLogEntry } from "@/services/platform-debug";

type DevLogLevelFilter = "all" | "error" | "warn" | "info" | "debug";

const LEVEL_FILTERS: { value: DevLogLevelFilter; label: string }[] = [
  { value: "all", label: "Toate" },
  { value: "error", label: "Erori" },
  { value: "warn", label: "Avertismente" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
];

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ro", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isErrorLevel(level: string): boolean {
  return level === "error";
}

function rowHighlightClass(level: string): string {
  if (level === "error") {
    return "border-red-900/50 bg-red-950/25 open:border-red-800/60";
  }
  if (level === "warn") {
    return "border-amber-900/30 bg-amber-950/10";
  }
  return "border-neutral-800 bg-neutral-800/40";
}

function DevLogDetails({ log }: { log: PlatformDevLogEntry }) {
  const hasContext = Object.keys(log.context).length > 0;

  return (
    <div className="platform-devlog-entry__details mt-2 space-y-2 border-t border-neutral-700/80 pt-2 text-xs text-neutral-400">
      {log.request_path && (
        <p>
          <span className="font-semibold text-neutral-300">Request:</span>{" "}
          <span className="font-mono">
            {log.request_method ?? "—"} {log.request_path}
          </span>
        </p>
      )}
      {log.user_email && (
        <p>
          <span className="font-semibold text-neutral-300">Utilizator:</span>{" "}
          <span className="font-mono">{log.user_email}</span>
        </p>
      )}
      {log.tenant_name && log.tenant_name !== "—" && (
        <p>
          <span className="font-semibold text-neutral-300">Tenant:</span>{" "}
          <span className="font-mono">
            {log.tenant_name} ({log.tenant_slug})
          </span>
        </p>
      )}
      {log.duration_ms != null && (
        <p>
          <span className="font-semibold text-neutral-300">Durată:</span>{" "}
          {log.duration_ms}ms
        </p>
      )}
      {log.stack && (
        <pre className="devlog-entry__stack max-h-48 overflow-auto rounded border border-neutral-700 bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-red-200/80">
          {log.stack}
        </pre>
      )}
      {hasContext && (
        <pre className="devlog-entry__context max-h-48 overflow-auto rounded border border-neutral-700 bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-neutral-300">
          {JSON.stringify(log.context, null, 2)}
        </pre>
      )}
    </div>
  );
}

function defaultLevelFilter(logs: PlatformDevLogEntry[]): DevLogLevelFilter {
  return logs.some((log) => log.level === "error") ? "error" : "all";
}

export function PlatformDevLogTable({ logs }: { logs: PlatformDevLogEntry[] }) {
  const [levelFilter, setLevelFilter] = useState<DevLogLevelFilter>(() =>
    defaultLevelFilter(logs)
  );

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: logs.length };
    for (const log of logs) {
      counts[log.level] = (counts[log.level] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (levelFilter === "all") return logs;
    return logs.filter((log) => log.level === levelFilter);
  }, [logs, levelFilter]);

  return (
    <div
      id="dev-logs"
      className="platform-log-section scroll-mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-3.5"
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            Erori & diagnostice (dev_logs)
            <span className="ml-2 text-sm font-normal text-neutral-500">
              ({filteredLogs.length}
              {levelFilter !== "all" ? ` / ${logs.length}` : ""} intrări)
            </span>
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Stack trace, context JSON și request — click pe intrare pentru
            detalii.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtru nivel dev_logs"
        >
          {LEVEL_FILTERS.map(({ value, label }) => {
            const count =
              value === "all" ? levelCounts.all : (levelCounts[value] ?? 0);
            const active = levelFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLevelFilter(value)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? value === "error"
                      ? "border-red-700 bg-red-950/50 text-red-200"
                      : "border-sky-700 bg-sky-950/40 text-sky-200"
                    : "border-neutral-700 bg-neutral-800/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                }`}
              >
                {label}
                <span className="ml-1 tabular-nums text-neutral-500">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="platform-log-cards max-h-[min(70dvh,36rem)] space-y-2 overflow-y-auto">
        {filteredLogs.map((log) => (
          <li key={log.id}>
            <details
              className={`platform-log-card group rounded-md border px-3 py-2.5 ${rowHighlightClass(log.level)} ${
                isErrorLevel(log.level) ? "open:ring-1 open:ring-red-900/40" : ""
              }`}
              open={isErrorLevel(log.level) && levelFilter === "error"}
            >
              <summary className="devlog-entry__summary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                  <time dateTime={log.created_at}>{formatWhen(log.created_at)}</time>
                  <span className="font-mono text-neutral-400">{log.tenant_slug}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`font-semibold uppercase ${DEV_LEVEL_COLOR[log.level] ?? "text-neutral-300"}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-neutral-400">{log.source}</span>
                  {log.duration_ms != null && (
                    <span className="text-neutral-500">{log.duration_ms}ms</span>
                  )}
                </div>
                <p className="devlog-entry__message mt-1 break-words text-sm text-neutral-300">
                  {log.message}
                </p>
              </summary>
              <DevLogDetails log={log} />
            </details>
          </li>
        ))}
        {filteredLogs.length === 0 && (
          <li className="rounded-md border border-dashed border-neutral-700 px-4 py-4 text-center text-sm text-neutral-500">
            {logs.length === 0
              ? "Niciun dev log încă. Erorile din server actions apar aici automat."
              : `Nicio intrare cu nivel „${levelFilter}".`}
          </li>
        )}
      </ul>

      <div className="platform-log-table-desktop nestio-logs-table-wrap max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-neutral-700 bg-neutral-900 text-left uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Când</th>
              <th className="px-3 py-2">Tenant</th>
              <th className="px-3 py-2">Nivel</th>
              <th className="px-3 py-2">Sursă</th>
              <th className="px-3 py-2">Mesaj</th>
              <th className="px-3 py-2">Detalii</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                className={`align-top hover:bg-neutral-800/50 ${
                  isErrorLevel(log.level) ? "bg-red-950/20" : ""
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {formatWhen(log.created_at)}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-400">
                  {log.tenant_slug}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`font-semibold uppercase ${DEV_LEVEL_COLOR[log.level] ?? "text-neutral-300"}`}
                  >
                    {log.level}
                  </span>
                </td>
                <td className="px-3 py-2 text-neutral-400">{log.source}</td>
                <td className="max-w-md px-3 py-2 text-neutral-300">
                  <p className="break-words">{log.message}</p>
                  {log.stack && (
                    <pre className="mt-1 max-h-24 overflow-auto font-mono text-[10px] text-red-200/70">
                      {log.stack}
                    </pre>
                  )}
                </td>
                <td className="max-w-xs px-3 py-2 text-neutral-500">
                  {log.request_path && (
                    <p className="font-mono text-[10px]">
                      {log.request_method} {log.request_path}
                    </p>
                  )}
                  {Object.keys(log.context).length > 0 && (
                    <pre className="mt-1 max-h-20 overflow-auto font-mono text-[10px]">
                      {JSON.stringify(log.context)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-neutral-500">
                  {logs.length === 0
                    ? "Niciun dev log încă. Erorile din server actions apar aici automat."
                    : `Nicio intrare cu nivel „${levelFilter}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

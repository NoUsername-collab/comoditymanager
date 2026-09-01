"use client";

import { useLocale, useTranslations } from "next-intl";
import { ACTION_COLOR } from "@/lib/platform-admin/log-styles";
import { TenantLogFilter } from "@/features/platform-admin/ui/TenantLogFilter";
import type { PlatformLogFilterOption } from "@/services/platform-logs-page-data";
import type { PlatformLogEntry } from "@/services/platform-debug";

function formatWhen(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlatformActivityLogTable({
  logs,
  filterOptions,
  activeTenantName,
}: {
  logs: PlatformLogEntry[];
  filterOptions: PlatformLogFilterOption[];
  activeTenantName: string | null;
}) {
  const t = useTranslations("platformAdmin.logsPage.activity");
  const locale = useLocale();

  const emptyMessage = activeTenantName
    ? t("emptyForTenant", { tenant: activeTenantName })
    : t("empty");

  return (
    <div className="platform-log-section rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <div className="platform-log-section__head mb-2 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {t("title")}
          {activeTenantName && (
            <span className="ml-2 text-sm font-normal text-sky-400">
              — {activeTenantName}
            </span>
          )}
          <span className="ml-2 text-sm font-normal text-neutral-500">
            {t("entryCount", { count: logs.length })}
          </span>
        </h2>
        <TenantLogFilter tenants={filterOptions} />
      </div>

      <p className="mb-3 text-xs text-neutral-500">{t("hint")}</p>

      <ul className="platform-log-cards max-h-[min(70dvh,36rem)] space-y-2 overflow-y-auto">
        {logs.map((log) => (
          <li
            key={log.id}
            className="platform-log-card rounded-md border border-neutral-800 bg-neutral-800/40 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
              <time dateTime={log.created_at}>
                {formatWhen(log.created_at, locale)}
              </time>
              <span className="font-mono text-neutral-400">{log.tenant_slug}</span>
            </div>
            <p
              className={`mt-1 text-sm font-medium ${ACTION_COLOR[log.action] ?? "text-neutral-300"}`}
            >
              {log.action}
            </p>
            <p className="mt-1 break-words text-sm text-neutral-300">{log.summary}</p>
            {log.actor_email && (
              <p className="mt-1 truncate text-xs text-neutral-500">{log.actor_email}</p>
            )}
          </li>
        ))}
        {logs.length === 0 && (
          <li className="rounded-md border border-dashed border-neutral-700 px-4 py-4 text-center text-sm text-neutral-500">
            {emptyMessage}
          </li>
        )}
      </ul>

      <div className="platform-log-table-desktop nestio-logs-table-wrap max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 border-b border-neutral-700 bg-neutral-900 text-left uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("when")}</th>
              <th className="px-3 py-2">{t("tenant")}</th>
              <th className="px-3 py-2">{t("action")}</th>
              <th className="px-3 py-2">{t("details")}</th>
              <th className="px-3 py-2">{t("actor")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="transition-colors hover:bg-neutral-800/50"
              >
                <td className="whitespace-nowrap px-3 py-2 text-neutral-500">
                  {formatWhen(log.created_at, locale)}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-400">
                  {log.tenant_slug}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`font-medium ${ACTION_COLOR[log.action] ?? "text-neutral-300"}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-neutral-400">
                  {log.summary}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {log.actor_email ?? "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-neutral-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

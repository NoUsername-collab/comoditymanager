import "@/app/admin/admin-devlog.css";
import { listDevLogs, type DevLogLevel } from "@/services/dev-logs";
import { DevLogFilters } from "@/components/admin/devlog/DevLogFilters";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { getTranslations } from "next-intl/server";

const LEVEL_STYLES: Record<DevLogLevel, { bg: string; text: string; border: string }> = {
  error: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  warn: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  info: { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" },
  debug: { bg: "#f9fafb", text: "#6b7280", border: "#d1d5db" },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function DevLogPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; source?: string; page?: string }>;
}) {
  const pageSize = 50;

  const [t, raw, logsResult] = await Promise.all([
    getTranslations("admin.devlog"),
    searchParams,
    searchParams.then((sp) => {
      const level = (sp.level as DevLogLevel) || undefined;
      const source = sp.source || undefined;
      const page = Math.max(1, Number(sp.page) || 1);
      return listDevLogs({
        level,
        source,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
        .then((logs) => ({ ok: true as const, logs }))
        .catch((e) => ({ ok: false as const, error: e }));
    }),
  ]);

  const level = (raw.level as DevLogLevel) || undefined;
  const source = raw.source || undefined;
  const page = Math.max(1, Number(raw.page) || 1);

  let logs: Awaited<ReturnType<typeof listDevLogs>> = { logs: [], total: 0 };
  let error: string | null = null;
  if (logsResult.ok) {
    logs = logsResult.logs;
  } else {
    error =
      logsResult.error instanceof Error
        ? logsResult.error.message
        : "Failed to load logs";
  }

  const totalPages = Math.ceil(logs.total / pageSize);

  return (
    <main className="devlog-page ml-content">
      <header className="devlog-page__header">
        <h1 className="devlog-page__title">Dev Log</h1>
        <p className="devlog-page__desc">
          Erori, avertismente și diagnostice server-side · {logs.total} intrări
        </p>
      </header>

      <DevLogFilters activeLevel={level} activeSource={source} />

      {error && <p className="devlog-page__error">{error}</p>}

      <div className="devlog-list">
        {logs.logs.length === 0 ? (
          <AdminEmptyState
            emoji="📋"
            title="Niciun log găsit"
            description="Nu există intrări pentru filtrele curente."
          />
        ) : (
          logs.logs.map((log) => {
            const style = LEVEL_STYLES[log.level];
            return (
              <details key={log.id} className="devlog-entry">
                <summary className="devlog-entry__summary">
                  <span
                    className="devlog-entry__level"
                    style={{
                      background: style.bg,
                      color: style.text,
                      borderColor: style.border,
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span className="devlog-entry__source">{log.source}</span>
                  <span className="devlog-entry__message">{log.message}</span>
                  <span className="devlog-entry__time">{formatTime(log.created_at)}</span>
                  {log.duration_ms != null && (
                    <span className="devlog-entry__duration">{log.duration_ms}ms</span>
                  )}
                </summary>
                <div className="devlog-entry__details">
                  {log.request_path && (
                    <p>
                      <strong>Request:</strong> {log.request_method} {log.request_path}
                    </p>
                  )}
                  {log.user_email && (
                    <p>
                      <strong>User:</strong> {log.user_email}
                    </p>
                  )}
                  {log.stack && (
                    <pre className="devlog-entry__stack">{log.stack}</pre>
                  )}
                  {Object.keys(log.context).length > 0 && (
                    <pre className="devlog-entry__context">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="devlog-pagination">
          {page > 1 && (
            <a
              href={`/admin/devlog?${new URLSearchParams({
                ...(level ? { level } : {}),
                ...(source ? { source } : {}),
                page: String(page - 1),
              })}`}
              className="devlog-pagination__btn"
            >
              {t("paginationPrev")}
            </a>
          )}
          <span className="devlog-pagination__info">
            {t("paginationPage", { page, total: totalPages })}
          </span>
          {page < totalPages && (
            <a
              href={`/admin/devlog?${new URLSearchParams({
                ...(level ? { level } : {}),
                ...(source ? { source } : {}),
                page: String(page + 1),
              })}`}
              className="devlog-pagination__btn"
            >
              {t("paginationNext")}
            </a>
          )}
        </div>
      )}
    </main>
  );
}

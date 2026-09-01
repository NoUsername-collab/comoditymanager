import { listDevLogs, type DevLogLevel } from "@/services/dev-logs";

export type { DevLogLevel } from "@/services/dev-logs";

const DEVLOG_PAGE_SIZE = 50;

export async function loadDevLogsPage(sp: {
  level?: string;
  source?: string;
  page?: string;
}) {
  const level = (sp.level as DevLogLevel) || undefined;
  const source = sp.source || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const logsResult = await listDevLogs({
    level,
    source,
    limit: DEVLOG_PAGE_SIZE,
    offset: (page - 1) * DEVLOG_PAGE_SIZE,
  })
    .then((logs) => ({ ok: true as const, logs }))
    .catch((error) => ({ ok: false as const, error }));

  return { pageSize: DEVLOG_PAGE_SIZE, level, source, page, logsResult };
}

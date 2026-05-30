import { createPublicAdminClient } from "@/lib/supabase/admin";

export type DevLogLevel = "error" | "warn" | "info" | "debug";

export type DevLogEntry = {
  id: string;
  level: DevLogLevel;
  source: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown>;
  request_path: string | null;
  request_method: string | null;
  user_id: string | null;
  user_email: string | null;
  duration_ms: number | null;
  created_at: string;
};

type LogInput = {
  level?: DevLogLevel;
  source?: string;
  message: string;
  stack?: string | null;
  context?: Record<string, unknown>;
  requestPath?: string | null;
  requestMethod?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  durationMs?: number | null;
};

/**
 * Scrie un log în dev_logs. Nu aruncă excepții — logarea nu trebuie
 * să blocheze niciodată fluxul principal.
 */
export async function writeDevLog(input: LogInput): Promise<void> {
  try {
    const supabase = createPublicAdminClient();
    await supabase.from("dev_logs").insert({
      level: input.level ?? "error",
      source: input.source ?? "server",
      message: input.message.slice(0, 2000),
      stack: input.stack?.slice(0, 4000) ?? null,
      context: input.context ?? {},
      request_path: input.requestPath ?? null,
      request_method: input.requestMethod ?? null,
      user_id: input.userId ?? null,
      user_email: input.userEmail ?? null,
      duration_ms: input.durationMs ?? null,
    });
  } catch {
    // Silenced — logging must never crash the app
  }
}

/**
 * Captează o eroare: extrage mesajul și stack-ul, scrie în dev_logs.
 */
export async function captureError(
  error: unknown,
  extra?: Omit<LogInput, "message" | "stack" | "level">
): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? null : null;
  await writeDevLog({
    level: "error",
    message,
    stack,
    ...extra,
  });
}

/**
 * Log de performanță: dacă o operație a durat mai mult de threshold ms.
 */
export async function captureSlowQuery(
  label: string,
  durationMs: number,
  threshold = 2000,
  extra?: Partial<LogInput>
): Promise<void> {
  if (durationMs < threshold) return;
  await writeDevLog({
    level: "warn",
    source: "performance",
    message: `Slow: ${label} took ${durationMs}ms (threshold: ${threshold}ms)`,
    durationMs,
    ...extra,
  });
}

/**
 * Listează loguri recente (admin devlog page).
 */
export async function listDevLogs(options?: {
  level?: DevLogLevel;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: DevLogEntry[]; total: number }> {
  const supabase = createPublicAdminClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("dev_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.level) {
    query = query.eq("level", options.level);
  }
  if (options?.source) {
    query = query.eq("source", options.source);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    logs: (data ?? []) as DevLogEntry[],
    total: count ?? 0,
  };
}

/**
 * Șterge loguri mai vechi de N zile.
 */
export async function purgeOldDevLogs(daysOld = 30): Promise<number> {
  const supabase = createPublicAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const { count, error } = await supabase
    .from("dev_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

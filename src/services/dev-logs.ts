import { getStaffUser } from "@/lib/auth/require-staff";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  resolveTenantIdFromHost,
  shouldSkipTenantErrorLog,
} from "@/lib/tenant/error-safeguard";
import { getTenantScope, withTenantId } from "@/lib/tenant/scope";

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
  requestHost?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  durationMs?: number | null;
};

async function resolveTenantIdForLog(
  requestHost?: string | null
): Promise<string | null> {
  if (requestHost) {
    return resolveTenantIdFromHost(requestHost);
  }
  const tenant = await resolveRequestTenant();
  return tenant?.id ?? null;
}

/**
 * Scrie un log în dev_logs (public schema, service role).
 * Nu necesită staff auth — vizibil în Hospira admin logs.
 * Nu aruncă excepții.
 */
export async function writeDevLog(input: LogInput): Promise<void> {
  try {
    const tenantId = await resolveTenantIdForLog(input.requestHost);
    if (!tenantId) return;

    let userId = input.userId ?? null;
    let userEmail = input.userEmail ?? null;
    if (!userId && !userEmail) {
      const user = await getStaffUser();
      userId = user?.id ?? null;
      userEmail = user?.email ?? null;
    }

    const supabase = createPublicAdminClient();
    const { error } = await supabase.from("dev_logs").insert({
      tenant_id: tenantId,
      level: input.level ?? "error",
      source: input.source ?? "server",
      message: input.message.slice(0, 2000),
      stack: input.stack?.slice(0, 4000) ?? null,
      context: input.context ?? {},
      request_path: input.requestPath ?? null,
      request_method: input.requestMethod ?? null,
      user_id: userId,
      user_email: userEmail,
      duration_ms: input.durationMs ?? null,
    });

    if (error) {
      console.error("[dev-logs] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[dev-logs] write failed:", e);
  }
}

/**
 * Captează o eroare tenant în dev_logs (Hospira admin).
 * Safe guard: nu aruncă, nu blochează fluxul.
 */
export async function captureTenantError(
  error: unknown,
  extra?: Omit<LogInput, "message" | "stack" | "level">
): Promise<void> {
  if (shouldSkipTenantErrorLog(error)) return;

  const message =
    error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? null : null;
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : null;

  await writeDevLog({
    level: "error",
    message,
    stack,
    context: {
      ...(extra?.context ?? {}),
      ...(digest ? { digest } : {}),
    },
    ...extra,
  });
}

/** @deprecated Prefer captureTenantError */
export async function captureError(
  error: unknown,
  extra?: Omit<LogInput, "message" | "stack" | "level">
): Promise<void> {
  await captureTenantError(error, extra);
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
  const { tenantId, supabase } = await getTenantScope();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from("dev_logs")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
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
  const { tenantId, supabase } = await getTenantScope();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const { count, error } = await supabase
    .from("dev_logs")
    .delete({ count: "exact" })
    .eq("tenant_id", tenantId)
    .lt("created_at", cutoff.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

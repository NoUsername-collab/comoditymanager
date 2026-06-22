import { cache } from "react";
import { getStaffUser } from "@/lib/auth/require-staff";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveRequestTenant } from "@/lib/tenant/active";
import {
  isTenantRequestHost,
  resolveTenantIdFromHost,
  shouldSkipTenantErrorLog,
} from "@/lib/tenant/error-safeguard";
import { getTenantBySlug } from "@/services/tenants";
import { throwIfDbError } from "@/lib/nestio-admin/format-db-error";
import { getTenantScope } from "@/lib/tenant/scope";

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
  if (requestHost && isTenantRequestHost(requestHost)) {
    const fromHost = await resolveTenantIdFromHost(requestHost);
    if (fromHost) return fromHost;
  }

  const tenant = await resolveRequestTenant();
  if (tenant?.id) return tenant.id;

  try {
    const { tenantId } = await getTenantScope();
    return tenantId;
  } catch {
    // Fără context staff (ex. API fără sesiune)
  }

  if (process.env.NODE_ENV === "development") {
    const devSlug = process.env.DEV_TENANT_SLUG?.trim();
    if (devSlug) {
      const devTenant = await getTenantBySlug(devSlug);
      if (devTenant?.id) return devTenant.id;
    }
  }

  return null;
}

/** Tenant anchor for Nestio platform admin (nestio.ro — fără host tenant). */
async function resolvePlatformLogTenantId(): Promise<string> {
  const devSlug = process.env.DEV_TENANT_SLUG?.trim();
  if (devSlug) {
    const devTenant = await getTenantBySlug(devSlug);
    if (devTenant?.id) return devTenant.id;
  }

  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  throwIfDbError("tenants (platform dev_log anchor)", error);
  if (!data?.id) {
    throw new Error(
      "[dev_logs] niciun tenant în DB — imposibil de scris log platformă"
    );
  }
  return data.id;
}

async function insertDevLogRow(
  tenantId: string,
  input: LogInput
): Promise<void> {
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

  throwIfDbError("dev_logs insert", error);
}

/**
 * Scrie un log în dev_logs (public schema, service role).
 * Aruncă la eșec insert — vizibil în Nestio admin logs + error boundary.
 */
export async function writeDevLog(input: LogInput): Promise<void> {
  const tenantId = await resolveTenantIdForLog(input.requestHost);
  if (!tenantId) {
    throw new Error(
      `[dev_logs] tenant_id nerezolvat — log pierdut (source=${input.source ?? "server"}, level=${input.level ?? "error"}, message=${input.message.slice(0, 160)})`
    );
  }

  await insertDevLogRow(tenantId, input);
}

/**
 * Scrie dev_log din context Nestio platform admin (fără subdomain tenant).
 * Aruncă la orice eșec — folosit când trebuie să știm exact ce s-a întâmplat.
 */
export async function writePlatformDevLog(
  input: LogInput & { tenantId?: string }
): Promise<void> {
  const tenantId = input.tenantId ?? (await resolvePlatformLogTenantId());
  await insertDevLogRow(tenantId, input);
}

/**
 * Captează o eroare tenant în dev_logs (Nestio admin).
 * Nu înlocuiește throw-ul acțiunii — doar persistă diagnosticul.
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

  try {
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
  } catch (writeError) {
    console.error("[dev-logs] captureTenantError write failed:", writeError);
  }
}

/**
 * Captează eroare din Nestio platform admin în dev_logs.
 * Aruncă dacă scrierea eșuează — nu ascunde problema.
 */
export async function capturePlatformAdminError(
  error: unknown,
  extra?: Omit<LogInput, "message" | "stack" | "level">
): Promise<void> {
  if (shouldSkipTenantErrorLog(error)) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack ?? null : null;
  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : null;

  await writePlatformDevLog({
    level: "error",
    source: extra?.source ?? "nestio-platform",
    message,
    stack,
    context: {
      ...(extra?.context ?? {}),
      ...(digest ? { digest } : {}),
      platformAdmin: true,
    },
    requestPath: extra?.requestPath,
    requestMethod: extra?.requestMethod,
    userId: extra?.userId,
    userEmail: extra?.userEmail,
    durationMs: extra?.durationMs,
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
  try {
    await writeDevLog({
      level: "warn",
      source: "performance",
      message: `Slow: ${label} took ${durationMs}ms (threshold: ${threshold}ms)`,
      durationMs,
      ...extra,
    });
  } catch (writeError) {
    console.error("[dev-logs] captureSlowQuery write failed:", writeError);
  }
}

const loadDevLogs = cache(async (
  level: DevLogLevel | undefined,
  source: string | undefined,
  limit: number,
  offset: number
): Promise<{ logs: DevLogEntry[]; total: number }> => {
  const { tenantId, supabase } = await getTenantScope();

  let query = supabase
    .from("dev_logs")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (level) {
    query = query.eq("level", level);
  }
  if (source) {
    query = query.eq("source", source);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    logs: (data ?? []) as DevLogEntry[],
    total: count ?? 0,
  };
});

/**
 * Listează loguri recente (admin devlog page).
 */
export async function listDevLogs(options?: {
  level?: DevLogLevel;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: DevLogEntry[]; total: number }> {
  return loadDevLogs(
    options?.level,
    options?.source,
    options?.limit ?? 50,
    options?.offset ?? 0
  );
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

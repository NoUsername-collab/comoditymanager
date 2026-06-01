/**
 * Platform Debug service — health checks and error logs.
 * Service-role only (bypasses RLS).
 */

import { createPublicAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────

export interface TenantHealthCheck {
  tenantId: string;
  slug: string;
  displayName: string;
  status: string;
  hasSettings: boolean;
  buildingCount: number;
  roomCount: number;
  memberCount: number;
  healthy: boolean;
  issues: string[];
}

export interface PlatformLogEntry {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  actor_email: string | null;
  created_at: string;
}

export interface PlatformDevLogEntry {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  level: string;
  source: string;
  message: string;
  created_at: string;
  user_email: string | null;
}

export type PlatformLogsResult = {
  activity: PlatformLogEntry[];
  dev: PlatformDevLogEntry[];
  activityError: string | null;
  devError: string | null;
};

// ─── Health Checks ──────────────────────────────────────────────

export async function runTenantHealthChecks(): Promise<TenantHealthCheck[]> {
  const supabase = createPublicAdminClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, display_name, status")
    .order("created_at", { ascending: false });

  if (!tenants) return [];

  const checks = await Promise.all(
    tenants.map(async (t) => {
      try {
        const safeCount = (p: PromiseLike<{ count: number | null }>) =>
          Promise.resolve(p).then((r) => r.count ?? 0).catch(() => 0);

        const [settings, buildings, rooms, members] = await Promise.all([
          Promise.resolve(
            supabase.from("pension_settings").select("id").eq("tenant_id", t.id).maybeSingle()
              .then((r) => r.data)
          ).catch(() => null),
          safeCount(supabase.from("buildings").select("id", { count: "exact", head: true }).eq("tenant_id", t.id)),
          safeCount(supabase.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id)),
          safeCount(supabase.from("tenant_members").select("id", { count: "exact", head: true }).eq("tenant_id", t.id).eq("is_active", true)),
        ]);

        const issues: string[] = [];
        const hasSettings = !!settings;
        if (!hasSettings) issues.push("Lipsesc pension_settings");
        if (buildings === 0) issues.push("Zero clădiri");
        if (rooms === 0) issues.push("Zero camere");
        if (members === 0) issues.push("Zero membri activi");
        if (t.status === "suspended") issues.push("Cont suspendat");
        if (t.status === "cancelled") issues.push("Cont anulat");

        return {
          tenantId: t.id,
          slug: t.slug,
          displayName: t.display_name,
          status: t.status,
          hasSettings,
          buildingCount: buildings,
          roomCount: rooms,
          memberCount: members,
          healthy: issues.length === 0,
          issues,
        };
      } catch {
        return {
          tenantId: t.id,
          slug: t.slug,
          displayName: t.display_name,
          status: t.status,
          hasSettings: false,
          buildingCount: 0,
          roomCount: 0,
          memberCount: 0,
          healthy: false,
          issues: ["Eroare la verificare — DB timeout sau query eșuat"],
        };
      }
    })
  );

  return checks;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function loadTenantMap(tenantIds: string[]) {
  if (tenantIds.length === 0) {
    return new Map<string, { slug: string; name: string }>();
  }

  const supabase = createPublicAdminClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, display_name")
    .in("id", tenantIds);

  return new Map(
    (tenants ?? []).map((t) => [t.id, { slug: t.slug, name: t.display_name }])
  );
}

// ─── Activity Logs ──────────────────────────────────────────────

export async function getPlatformLogs(
  limit = 100,
  tenantId?: string | null
): Promise<PlatformLogEntry[]> {
  const result = await getPlatformLogsBundle(limit, tenantId);
  return result.activity;
}

export async function getPlatformDevLogs(
  limit = 100,
  tenantId?: string | null
): Promise<PlatformDevLogEntry[]> {
  const result = await getPlatformLogsBundle(limit, tenantId);
  return result.dev;
}

/** Activity + dev logs for Hospira admin (surfaces query errors). */
export async function getPlatformLogsBundle(
  limit = 100,
  tenantId?: string | null
): Promise<PlatformLogsResult> {
  const supabase = createPublicAdminClient();
  const filterId = tenantId && isUuid(tenantId) ? tenantId : null;

  let activityQuery = supabase
    .from("admin_activity_log")
    .select(
      "id, tenant_id, action, entity_type, entity_id, summary, created_at, actor_email"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterId) {
    activityQuery = activityQuery.eq("tenant_id", filterId);
  }

  let devQuery = supabase
    .from("dev_logs")
    .select("id, tenant_id, level, source, message, created_at, user_email")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterId) {
    devQuery = devQuery.eq("tenant_id", filterId);
  }

  const [activityRes, devRes] = await Promise.all([activityQuery, devQuery]);

  const activityError = activityRes.error?.message ?? null;
  const devError = devRes.error?.message ?? null;
  const activityRows = activityRes.data ?? [];
  const devRows = devRes.data ?? [];

  const tenantIds = [
    ...new Set([
      ...activityRows.map((d) => d.tenant_id).filter(Boolean),
      ...devRows.map((d) => d.tenant_id).filter(Boolean),
    ]),
  ] as string[];

  const tenantMap = await loadTenantMap(tenantIds);

  const activity: PlatformLogEntry[] = activityRows.map((d) => {
    const tenant = tenantMap.get(d.tenant_id);
    return {
      id: d.id,
      tenant_id: d.tenant_id,
      tenant_slug: tenant?.slug ?? "—",
      tenant_name: tenant?.name ?? "—",
      action: d.action,
      entity_type: d.entity_type,
      entity_id: d.entity_id,
      summary: d.summary ?? "",
      actor_email: d.actor_email ?? null,
      created_at: d.created_at,
    };
  });

  const dev: PlatformDevLogEntry[] = devRows.map((d) => {
    const tenant = tenantMap.get(d.tenant_id);
    return {
      id: d.id,
      tenant_id: d.tenant_id,
      tenant_slug: tenant?.slug ?? "—",
      tenant_name: tenant?.name ?? "—",
      level: d.level,
      source: d.source,
      message: d.message,
      created_at: d.created_at,
      user_email: d.user_email ?? null,
    };
  });

  return { activity, dev, activityError, devError };
}

/**
 * Platform Debug service — health checks and error logs.
 * Service-role only (bypasses RLS).
 */

import { cache } from "react";
import { throwIfDbError } from "@/lib/hospira-admin/format-db-error";
import {
  getTenantResourceCounts,
  loadTenantResourceCounts,
} from "@/lib/hospira-admin/tenant-resource-counts";
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
  stack: string | null;
  context: Record<string, unknown>;
  request_path: string | null;
  request_method: string | null;
  duration_ms: number | null;
  created_at: string;
  user_email: string | null;
}

export type PlatformLogsResult = {
  activity: PlatformLogEntry[];
  dev: PlatformDevLogEntry[];
};

// ─── Health Checks ──────────────────────────────────────────────

function buildTenantHealthCheck(
  tenant: {
    id: string;
    slug: string;
    display_name: string;
    status: string;
  },
  resources: ReturnType<typeof getTenantResourceCounts>
): TenantHealthCheck {
  const issues: string[] = [];
  if (!resources.has_settings) issues.push("Lipsesc pension_settings");
  if (resources.building_count === 0) issues.push("Zero clădiri");
  if (resources.room_count === 0) issues.push("Zero camere");
  if (resources.member_count === 0) issues.push("Zero membri activi");
  if (tenant.status === "suspended") issues.push("Cont suspendat");
  if (tenant.status === "cancelled") issues.push("Cont anulat");

  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    displayName: tenant.display_name,
    status: tenant.status,
    hasSettings: resources.has_settings,
    buildingCount: resources.building_count,
    roomCount: resources.room_count,
    memberCount: resources.member_count,
    healthy: issues.length === 0,
    issues,
  };
}

/** Health snapshot for all tenants — 2 DB round-trips at 100+ tenants. */
export const runTenantHealthChecks = cache(async (): Promise<TenantHealthCheck[]> => {
  const supabase = createPublicAdminClient();

  const [{ data: tenants, error: tenantsError }, resourceCounts] =
    await Promise.all([
      supabase
        .from("tenants")
        .select("id, slug, display_name, status")
        .order("created_at", { ascending: false }),
      loadTenantResourceCounts(supabase),
    ]);

  throwIfDbError("tenants (health check)", tenantsError);
  if (!tenants) {
    throw new Error("[tenants (health check)] no data returned");
  }

  return tenants.map((tenant) =>
    buildTenantHealthCheck(tenant, getTenantResourceCounts(resourceCounts, tenant.id))
  );
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function loadTenantMap(tenantIds: string[]) {
  if (tenantIds.length === 0) {
    return new Map<string, { slug: string; name: string }>();
  }

  const supabase = createPublicAdminClient();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, slug, display_name")
    .in("id", tenantIds);

  throwIfDbError("tenants (log enrichment)", error);

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

/** Activity + dev logs for Hospira admin — throws on query failure. */
export const getPlatformLogsBundle = cache(async (
  limit = 100,
  tenantId?: string | null
): Promise<PlatformLogsResult> => {
  const supabase = createPublicAdminClient();

  if (tenantId && !isUuid(tenantId)) {
    throw new Error(
      `[platform logs] invalid tenant filter "${tenantId}" (expected UUID)`
    );
  }

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
    .select(
      "id, tenant_id, level, source, message, stack, context, request_path, request_method, duration_ms, created_at, user_email"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterId) {
    devQuery = devQuery.eq("tenant_id", filterId);
  }

  const [activityRes, devRes] = await Promise.all([activityQuery, devQuery]);

  throwIfDbError("admin_activity_log", activityRes.error);
  throwIfDbError("dev_logs", devRes.error);

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
      stack: d.stack ?? null,
      context:
        d.context && typeof d.context === "object" && !Array.isArray(d.context)
          ? (d.context as Record<string, unknown>)
          : {},
      request_path: d.request_path ?? null,
      request_method: d.request_method ?? null,
      duration_ms: d.duration_ms ?? null,
      created_at: d.created_at,
      user_email: d.user_email ?? null,
    };
  });

  return { activity, dev };
});

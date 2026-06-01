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
      const issues: string[] = [];

      const [settings, buildings, rooms, members] = await Promise.all([
        supabase
          .from("pension_settings")
          .select("id")
          .eq("tenant_id", t.id)
          .maybeSingle()
          .then((r) => r.data),
        supabase
          .from("buildings")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", t.id)
          .then((r) => r.count ?? 0),
        supabase
          .from("rooms")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", t.id)
          .then((r) => r.count ?? 0),
        supabase
          .from("tenant_members")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", t.id)
          .eq("is_active", true)
          .then((r) => r.count ?? 0),
      ]);

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
    })
  );

  return checks;
}

// ─── Activity Logs ──────────────────────────────────────────────

export async function getPlatformLogs(
  limit = 100,
  tenantId?: string | null
): Promise<PlatformLogEntry[]> {
  const supabase = createPublicAdminClient();

  let query = supabase
    .from("admin_activity_log")
    .select(
      "id, tenant_id, action, entity_type, entity_id, summary, created_at, actor_email:metadata->actor->email"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  // Fetch tenant names for display
  const tenantIds = [...new Set(data.map((d) => d.tenant_id).filter(Boolean))];
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, display_name")
    .in("id", tenantIds);

  const tenantMap = new Map(
    (tenants ?? []).map((t) => [t.id, { slug: t.slug, name: t.display_name }])
  );

  return data.map((d) => {
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
      actor_email: typeof d.actor_email === "string" ? d.actor_email : null,
      created_at: d.created_at,
    };
  });
}

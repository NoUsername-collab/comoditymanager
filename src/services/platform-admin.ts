/**
 * Platform Admin service — cross-tenant queries for Nestio internal panel.
 * All queries use service_role client (bypasses RLS).
 */

import { cache } from "react";
import { throwIfDbError } from "@/lib/platform-admin/format-db-error";
import { safeCount } from "@/lib/platform-admin/safe-count";
import {
  getTenantResourceCounts,
  loadTenantResourceCounts,
} from "@/lib/platform-admin/tenant-resource-counts";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { TenantRow } from "./tenants";
import { PLAN_CONFIGS, type PlanId } from "@/core/config/plans";
import { loadTenantEmailListAlerts } from "@/lib/platform-admin/tenant-email-alerts";
import { quickSetupIncomplete } from "@/domain/platform-admin/tenant-onboarding";
import type { EmailUsageAlertLevel } from "@/domain/email/usage-alert";

// ─── Types ──────────────────────────────────────────────────────

export interface PlatformTenantSummary extends TenantRow {
  member_count: number;
  room_count: number;
  booking_count: number;
  domain_hosts: string[];
  email_sent_month: number;
  email_cap_month: number | null;
  email_alert: EmailUsageAlertLevel;
  setup_incomplete: boolean;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  signupsLast7d: number;
  totalRooms: number;
  totalBookings: number;
  bookingsCreatedToday: number;
  activeStaysToday: number;
  recentErrors24h: number;
  mrr: number; // Monthly Recurring Revenue in EUR
  planDistribution: Record<string, number>;
}

export type TenantLastActivity = {
  lastActivityAt: string | null;
  lastAction: string | null;
  lastActorEmail: string | null;
};

// ─── Queries ────────────────────────────────────────────────────

export type TenantFilterOption = {
  id: string;
  slug: string;
  displayName: string;
};

function attachResourceCounts<T extends { id: string }>(
  tenants: T[],
  resourceCounts: Awaited<ReturnType<typeof loadTenantResourceCounts>>,
  domainMap: Map<string, string[]>
): Array<
  T & {
    member_count: number;
    room_count: number;
    booking_count: number;
    domain_hosts: string[];
  }
> {
  return tenants.map((tenant) => {
    const counts = getTenantResourceCounts(resourceCounts, tenant.id);
    return {
      ...tenant,
      member_count: counts.member_count,
      room_count: counts.room_count,
      booking_count: counts.booking_count,
      domain_hosts: domainMap.get(tenant.id) ?? [],
    };
  });
}

async function loadTenantDomainMap(
  supabase: ReturnType<typeof createPublicAdminClient>
): Promise<Map<string, string[]>> {
  const { data: domainRows, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id, domain");

  throwIfDbError("tenant_domains (listAllTenants)", error);

  const map = new Map<string, string[]>();
  for (const row of domainRows ?? []) {
    const list = map.get(row.tenant_id) ?? [];
    list.push(row.domain);
    map.set(row.tenant_id, list);
  }
  return map;
}

/** Lightweight tenant list for filters/dropdowns (no resource counts). */
export const listTenantFilterOptions = cache(async (): Promise<TenantFilterOption[]> => {
  const supabase = createPublicAdminClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, slug, display_name")
    .order("display_name", { ascending: true });

  throwIfDbError("tenants (listTenantFilterOptions)", error);
  if (!tenants) {
    throw new Error("[tenants (listTenantFilterOptions)] no data returned");
  }

  return tenants.map((tenant) => ({
    id: tenant.id,
    slug: tenant.slug,
    displayName: tenant.display_name,
  }));
});

/** List all tenants with summary counts — 2 DB round-trips at 100+ tenants. */
export const listAllTenants = cache(async (): Promise<PlatformTenantSummary[]> => {
  const supabase = createPublicAdminClient();

  const [{ data: tenants, error }, resourceCounts, domainMap] = await Promise.all([
    supabase.from("tenants").select("*").order("created_at", { ascending: false }),
    loadTenantResourceCounts(supabase),
    loadTenantDomainMap(supabase),
  ]);

  throwIfDbError("tenants (listAllTenants)", error);
  if (!tenants) {
    throw new Error("[tenants (listAllTenants)] no data returned");
  }

  const withCounts = attachResourceCounts(tenants, resourceCounts, domainMap);
  const emailAlerts = await loadTenantEmailListAlerts(
    withCounts.map((t) => ({ id: t.id, plan_id: t.plan_id })),
  );

  return withCounts.map((tenant) => {
    const email = emailAlerts.get(tenant.id);
    return {
      ...tenant,
      email_sent_month: email?.sentCount ?? 0,
      email_cap_month: email?.cap ?? null,
      email_alert: email?.alert ?? "unlimited",
      setup_incomplete: quickSetupIncomplete(tenant),
    };
  }) as PlatformTenantSummary[];
});

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadPlatformTodayMetrics() {
  const supabase = createPublicAdminClient();
  const today = todayIsoDate();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [createdToday, activeStays, recentErrors] = await Promise.all([
    safeCount(
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`)
    ),
    safeCount(
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .lte("check_in", today)
        .gt("check_out", today)
        .neq("status", "anulata")
    ),
    safeCount(
      supabase
        .from("dev_logs")
        .select("id", { count: "exact", head: true })
        .eq("level", "error")
        .gte("created_at", since24h)
    ),
  ]);

  return {
    bookingsCreatedToday: createdToday,
    activeStaysToday: activeStays,
    recentErrors24h: recentErrors,
  };
}

/** Aggregate platform statistics. */
export const getPlatformStats = cache(async (): Promise<PlatformStats> => {
  const [tenants, todayMetrics] = await Promise.all([
    listAllTenants(),
    loadPlatformTodayMetrics(),
  ]);

  const planDistribution: Record<string, number> = {};
  let mrr = 0;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let signupsLast7d = 0;

  for (const t of tenants) {
    if (new Date(t.created_at).getTime() >= sevenDaysAgo) {
      signupsLast7d += 1;
    }
    const planId = t.plan_id || "free";
    planDistribution[planId] = (planDistribution[planId] || 0) + 1;

    // MRR only counts paying tenants
    if (t.is_paying && (t.status === "active" || t.status === "trial")) {
      const planConfig = PLAN_CONFIGS[planId as PlanId];
      if (planConfig) {
        mrr += planConfig.priceEur;
      }
    }
  }

  return {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t) => t.status === "active").length,
    trialTenants: tenants.filter((t) => t.status === "trial").length,
    suspendedTenants: tenants.filter((t) => t.status === "suspended").length,
    cancelledTenants: tenants.filter((t) => t.status === "cancelled").length,
    signupsLast7d,
    totalRooms: tenants.reduce((sum, t) => sum + t.room_count, 0),
    totalBookings: tenants.reduce((sum, t) => sum + t.booking_count, 0),
    bookingsCreatedToday: todayMetrics.bookingsCreatedToday,
    activeStaysToday: todayMetrics.activeStaysToday,
    recentErrors24h: todayMetrics.recentErrors24h,
    mrr,
    planDistribution,
  };
});

/** Get a single tenant by ID with full details. */
export const getPlatformTenantById = cache(async (
  tenantId: string
): Promise<PlatformTenantSummary | null> => {
  const supabase = createPublicAdminClient();

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) return null;

  const [members, rooms, bookings, domains] = await Promise.all([
    safeCount(
      supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
    ),
    safeCount(
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
    ),
    safeCount(
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
    ),
    loadTenantDomainsForTenant(supabase, tenantId),
  ]);

  const summary = {
    ...tenant,
    member_count: members,
    room_count: rooms,
    booking_count: bookings,
    domain_hosts: domains,
  };

  const emailAlerts = await loadTenantEmailListAlerts([
    { id: tenantId, plan_id: tenant.plan_id },
  ]);
  const email = emailAlerts.get(tenantId);

  return {
    ...summary,
    email_sent_month: email?.sentCount ?? 0,
    email_cap_month: email?.cap ?? null,
    email_alert: email?.alert ?? "unlimited",
    setup_incomplete: quickSetupIncomplete(summary),
  } as PlatformTenantSummary;
});

async function loadTenantDomainsForTenant(
  supabase: ReturnType<typeof createPublicAdminClient>,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tenant_domains")
    .select("domain")
    .eq("tenant_id", tenantId);

  throwIfDbError("tenant_domains (getPlatformTenantById)", error);
  return (data ?? []).map((row) => row.domain);
}

/** Lightweight read before platform-admin mutations (no counts / domain scan). */
export async function getTenantMutationSnapshot(
  tenantId: string
): Promise<{
  plan_id: string | null;
  status: string;
  is_paying: boolean | null;
  active_modules: string[] | null;
} | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("plan_id, status, is_paying, active_modules")
    .eq("id", tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/** Most recent admin_activity_log entry for a tenant. */
export const getTenantLastActivity = cache(async (
  tenantId: string
): Promise<TenantLastActivity> => {
  const supabase = createPublicAdminClient();

  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("action, actor_email, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfDbError("admin_activity_log (last activity)", error);

  if (!data) {
    return {
      lastActivityAt: null,
      lastAction: null,
      lastActorEmail: null,
    };
  }

  return {
    lastActivityAt: data.created_at,
    lastAction: data.action,
    lastActorEmail: data.actor_email ?? null,
  };
});

// ─── Mutations ──────────────────────────────────────────────────

/** Update a tenant's plan. */
export async function updateTenantPlan(
  tenantId: string,
  planId: PlanId
): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicAdminClient();

  const { error } = await supabase
    .from("tenants")
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Update a tenant's status. */
export async function updateTenantStatus(
  tenantId: string,
  status: "active" | "trial" | "suspended" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  if (readError) return { success: false, error: readError.message };

  const { error } = await supabase
    .from("tenants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };

  if (existing?.slug) {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(`tenant-slug-${existing.slug}`, "max");
    revalidateTag(`tenant-slug-status-${existing.slug}`, "max");
  }

  return { success: true };
}

/** Update a tenant's active modules. */
export async function updateTenantModules(
  tenantId: string,
  modules: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicAdminClient();

  const { error } = await supabase
    .from("tenants")
    .update({
      active_modules: modules,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Update a tenant's billing flag. */
export async function updateTenantBilling(
  tenantId: string,
  isPaying: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicAdminClient();

  const { error } = await supabase
    .from("tenants")
    .update({
      is_paying: isPaying,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}


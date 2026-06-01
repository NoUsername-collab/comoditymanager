/**
 * Platform Admin service — cross-tenant queries for Hospira internal panel.
 * All queries use service_role client (bypasses RLS).
 */

import { createPublicAdminClient } from "@/lib/supabase/admin";
import type { TenantRow } from "./tenants";
import { PLAN_CONFIGS, type PlanId } from "@/core/config/plans";

// ─── Types ──────────────────────────────────────────────────────

export interface PlatformTenantSummary extends TenantRow {
  member_count: number;
  room_count: number;
  booking_count: number;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalRooms: number;
  totalBookings: number;
  mrr: number; // Monthly Recurring Revenue in EUR
  planDistribution: Record<string, number>;
}

// ─── Queries ────────────────────────────────────────────────────

/** List all tenants with summary counts. */
export async function listAllTenants(): Promise<PlatformTenantSummary[]> {
  const supabase = createPublicAdminClient();

  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !tenants) return [];

  const safeCount = (p: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(p).then((r) => r.count ?? 0).catch(() => 0);

  const enriched = await Promise.all(
    tenants.map(async (t) => {
      const [members, rooms, bookings] = await Promise.all([
        safeCount(supabase.from("tenant_members").select("id", { count: "exact", head: true }).eq("tenant_id", t.id).eq("is_active", true)),
        safeCount(supabase.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id)),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("tenant_id", t.id)),
      ]);

      return {
        ...t,
        member_count: members,
        room_count: rooms,
        booking_count: bookings,
      } as PlatformTenantSummary;
    })
  );

  return enriched;
}

/** Aggregate platform statistics. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const tenants = await listAllTenants();

  const planDistribution: Record<string, number> = {};
  let mrr = 0;

  for (const t of tenants) {
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
    totalRooms: tenants.reduce((sum, t) => sum + t.room_count, 0),
    totalBookings: tenants.reduce((sum, t) => sum + t.booking_count, 0),
    mrr,
    planDistribution,
  };
}

/** Get a single tenant by ID with full details. */
export async function getPlatformTenantById(
  tenantId: string
): Promise<PlatformTenantSummary | null> {
  const supabase = createPublicAdminClient();

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) return null;

  const safeCount = (p: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(p).then((r) => r.count ?? 0).catch(() => 0);

  const [members, rooms, bookings] = await Promise.all([
    safeCount(supabase.from("tenant_members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true)),
    safeCount(supabase.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)),
    safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)),
  ]);

  return {
    ...tenant,
    member_count: members,
    room_count: rooms,
    booking_count: bookings,
  } as PlatformTenantSummary;
}

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

  const { error } = await supabase
    .from("tenants")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) return { success: false, error: error.message };
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

/** Get recent activity logs across all tenants. */
export async function getPlatformActivityLogs(limit = 50) {
  const supabase = createPublicAdminClient();

  const { data, error } = await supabase
    .from("admin_activity_log")
    .select("*, tenants!inner(slug, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

/**
 * Platform Admin service — cross-tenant queries for Nestio internal panel.
 * All queries use service_role client (bypasses RLS).
 */

import { cache } from "react";
import { throwIfDbError } from "@/lib/hospira-admin/format-db-error";
import { safeCount } from "@/lib/hospira-admin/safe-count";
import {
  getTenantResourceCounts,
  loadTenantResourceCounts,
} from "@/lib/hospira-admin/tenant-resource-counts";
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

export type TenantFilterOption = {
  id: string;
  slug: string;
  displayName: string;
};

function attachResourceCounts<T extends { id: string }>(
  tenants: T[],
  resourceCounts: Awaited<ReturnType<typeof loadTenantResourceCounts>>
): Array<T & { member_count: number; room_count: number; booking_count: number }> {
  return tenants.map((tenant) => {
    const counts = getTenantResourceCounts(resourceCounts, tenant.id);
    return {
      ...tenant,
      member_count: counts.member_count,
      room_count: counts.room_count,
      booking_count: counts.booking_count,
    };
  });
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

  const [{ data: tenants, error }, resourceCounts] = await Promise.all([
    supabase.from("tenants").select("*").order("created_at", { ascending: false }),
    loadTenantResourceCounts(supabase),
  ]);

  throwIfDbError("tenants (listAllTenants)", error);
  if (!tenants) {
    throw new Error("[tenants (listAllTenants)] no data returned");
  }

  return attachResourceCounts(tenants, resourceCounts) as PlatformTenantSummary[];
});

/** Aggregate platform statistics. */
export const getPlatformStats = cache(async (): Promise<PlatformStats> => {
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

  const [members, rooms, bookings] = await Promise.all([
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
  ]);

  return {
    ...tenant,
    member_count: members,
    room_count: rooms,
    booking_count: bookings,
  } as PlatformTenantSummary;
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


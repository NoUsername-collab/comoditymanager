/**
 * Onboarding service — builds snapshot from DB, computes progress.
 * Uses existing tenant scope (service_role, tenant-scoped).
 */

import { getTenantScope } from "@/lib/tenant/scope";
import type { OnboardingSnapshot } from "@/domain/onboarding/steps";
import {
  computeOnboardingProgress,
  type OnboardingProgress,
} from "@/domain/onboarding/progress";

/** Build the onboarding snapshot from current tenant data. */
export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const { tenantId, supabase } = await getTenantScope();

  const safeCount = (p: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(p).then((r) => r.count ?? 0).catch(() => 0);

  const [
    pensionSettings,
    buildingCount,
    roomCount,
    bookingCount,
    confirmedCount,
    memberCount,
  ] = await Promise.all([
    Promise.resolve(
      supabase.from("pension_settings").select("display_name").eq("tenant_id", tenantId).maybeSingle()
        .then((r) => r.data)
    ).catch(() => null),

    safeCount(supabase.from("buildings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)),
    safeCount(supabase.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)),
    safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId)),
    safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "confirmata")),
    safeCount(supabase.from("tenant_members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_active", true).neq("role", "owner")),
  ]);

  const displayName = pensionSettings?.display_name?.trim() ?? "";

  return {
    hasPensionName: displayName.length > 0,
    buildingCount,
    roomCount,
    hasBooking: bookingCount > 0,
    hasConfirmedBooking: confirmedCount > 0,
    teamMemberCount: memberCount,
    hasPublicPage: roomCount > 0, // public page works when rooms exist
  };
}

/** Full onboarding progress for the current tenant. */
export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  const snapshot = await getOnboardingSnapshot();
  return computeOnboardingProgress(snapshot);
}

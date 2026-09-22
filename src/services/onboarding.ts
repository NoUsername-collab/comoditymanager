/**
 * Onboarding service — builds snapshot from DB, computes progress.
 * Uses existing tenant scope (service_role, tenant-scoped).
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getTenantScope } from "@/lib/tenant/scope";
import type { OnboardingSnapshot } from "@/domain/onboarding/steps";
import {
  computeOnboardingProgress,
  type OnboardingProgress,
} from "@/domain/onboarding/progress";

const safeCount = (p: PromiseLike<{ count: number | null }>) =>
  Promise.resolve(p).then((r) => r.count ?? 0).catch(() => 0);

export async function tenantHasAnyRoom(tenantId: string): Promise<boolean> {
  const supabase = createPublicAdminClient();
  const count = await safeCount(
    supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
  );
  return count > 0;
}

async function getOnboardingSnapshotUncached(
  tenantId: string
): Promise<OnboardingSnapshot> {
  const supabase = createPublicAdminClient();

  const [
    pensionSettings,
    buildingCount,
    roomCount,
    memberCount,
    publicSite,
  ] = await Promise.all([
    Promise.resolve(
      supabase
        .from("pension_settings")
        .select("display_name")
        .eq("tenant_id", tenantId)
        .maybeSingle()
        .then((r) => r.data)
    ).catch(() => null),

    safeCount(
      supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
    ),
    safeCount(
      supabase
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
    ),
    safeCount(
      supabase
        .from("tenant_members")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .neq("role", "owner")
    ),
    Promise.resolve(
      supabase
        .from("public_site_settings")
        .select("published")
        .eq("tenant_id", tenantId)
        .maybeSingle()
        .then((r) => r.data)
    ).catch(() => null),
  ]);

  const displayName = pensionSettings?.display_name?.trim() ?? "";

  return {
    hasPensionName: displayName.length > 0,
    buildingCount,
    roomCount,
    teamMemberCount: memberCount,
    hasPublicPage: publicSite?.published === true,
  };
}

const getCachedOnboardingSnapshot = (tenantId: string) =>
  unstable_cache(
    () => getOnboardingSnapshotUncached(tenantId),
    ["onboarding-snapshot", tenantId],
    {
      tags: [
        CACHE_TAGS.buildings,
        CACHE_TAGS.rooms,
        CACHE_TAGS.pensionSettings,
        CACHE_TAGS.publicSite,
        tenantTag(tenantId, CACHE_TAGS.buildings),
        tenantTag(tenantId, CACHE_TAGS.rooms),
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
        tenantTag(tenantId, CACHE_TAGS.publicSite),
      ],
      revalidate: 60,
    }
  );

const loadOnboardingSnapshot = cache((tenantId: string) =>
  getCachedOnboardingSnapshot(tenantId)()
);

/** Build the onboarding snapshot from current tenant data. */
export async function getOnboardingSnapshot(): Promise<OnboardingSnapshot> {
  const { tenantId } = await getTenantScope();
  return loadOnboardingSnapshot(tenantId);
}

const loadOnboardingProgress = cache(async (): Promise<OnboardingProgress> => {
  const snapshot = await getOnboardingSnapshot();
  return computeOnboardingProgress(snapshot);
});

/** Full onboarding progress for the current tenant. */
export async function getOnboardingProgress(): Promise<OnboardingProgress> {
  return loadOnboardingProgress();
}

import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  canReceiveOnboardingSetupIssues,
  resolveBuildingsColorSetupIssue,
  resolveContactEmailSetupIssue,
  resolveMfaSetupIssue,
  resolveThemeSetupIssue,
  shouldResolveSetupIssues,
} from "@/domain/setup-issues/checks";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { isMfaRecommendedForUser } from "@/lib/auth/mfa-policy";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { listBuildings } from "@/services/buildings";
import { loadOnboardingIssueContext } from "@/services/setup-issues-context";
import type { TenantMemberRole } from "@/domain/tenant/types";

export type ResolveSetupIssuesOpts = {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
};

const loadMfaFactors = cache(async (email: string) => {
  const supabase = await createClient();
  return supabase.auth.mfa.listFactors();
});

async function resolveSetupIssuesUncached(
  opts: ResolveSetupIssuesOpts
): Promise<SetupIssue[]> {
  if (!shouldResolveSetupIssues(opts)) {
    return [];
  }

  const checkMfa = isMfaRecommendedForUser(opts);
  const needsOnboarding = canReceiveOnboardingSetupIssues(opts);
  const issues: SetupIssue[] = [];

  const [factorsResult, onboardingBundle] = await Promise.all([
    checkMfa ? loadMfaFactors(opts.email ?? "") : Promise.resolve({ data: null }),
    needsOnboarding
      ? Promise.all([
          loadOnboardingIssueContext(),
          listBuildings().catch(() => []),
        ])
      : Promise.resolve(null),
  ]);

  if (checkMfa) {
    const mfaIssue = resolveMfaSetupIssue({
      ...opts,
      factors: factorsResult.data,
    });
    if (mfaIssue) issues.push(mfaIssue);
  }

  if (needsOnboarding && onboardingBundle) {
    const [onboardingContext, buildings] = onboardingBundle;

    const themeIssue = resolveThemeSetupIssue({
      ...opts,
      rawPaletteKey: onboardingContext.rawPaletteKey,
      appearanceSaved: onboardingContext.appearanceSaved,
    });
    if (themeIssue) issues.push(themeIssue);

    const buildingsIssue = resolveBuildingsColorSetupIssue({
      ...opts,
      buildings,
    });
    if (buildingsIssue) issues.push(buildingsIssue);

    const contactIssue = resolveContactEmailSetupIssue({
      ...opts,
      pensionEmail: onboardingContext.pensionEmail,
      publicSiteEmail: onboardingContext.publicSiteEmail,
      usePrimaryContact: onboardingContext.usePrimaryContact,
    });
    if (contactIssue) issues.push(contactIssue);
  }

  return issues;
}

const getCachedSetupIssues = (
  tenantId: string,
  email: string,
  memberRole: string,
) =>
  unstable_cache(
    () =>
      resolveSetupIssuesUncached({
        email: email || null,
        memberRole: (memberRole || null) as TenantMemberRole | null,
      }),
    ["setup-issues", tenantId, email, memberRole],
    {
      tags: [
        CACHE_TAGS.pensionSettings,
        CACHE_TAGS.buildings,
        CACHE_TAGS.publicSite,
        tenantTag(tenantId, CACHE_TAGS.pensionSettings),
        tenantTag(tenantId, CACHE_TAGS.buildings),
      ],
      revalidate: 300,
    },
  );

const loadSetupIssues = cache(async (email: string, memberRole: string) => {
  const tenantId = await resolveTenantIdForData();
  return getCachedSetupIssues(tenantId, email, memberRole)();
});

/** Single source of truth for unresolved admin setup / security issues. */
export async function resolveSetupIssues(
  opts: ResolveSetupIssuesOpts
): Promise<SetupIssue[]> {
  return loadSetupIssues(opts.email ?? "", opts.memberRole ?? "");
}

/** Alias — same resolver, used in layouts and settings pages. */
export const getSetupIssues = resolveSetupIssues;

import { cache } from "react";
import {
  resolveBuildingsColorSetupIssue,
  resolveContactEmailSetupIssue,
  resolveMfaSetupIssue,
  resolveThemeSetupIssue,
} from "@/domain/setup-issues/checks";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { createClient } from "@/lib/supabase/server";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import { listBuildings } from "@/services/buildings";
import type { TenantMemberRole } from "@/services/tenant-members";

export type ResolveSetupIssuesOpts = {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
};

async function hasAppearanceBeenSaved(tenantId: string): Promise<boolean> {
  const supabase = createPublicAdminClient();
  const { count, error } = await supabase
    .from("admin_activity_log")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("action", "settings.appearance_updated");

  if (error) return false;
  return (count ?? 0) > 0;
}

async function loadOnboardingIssueContext(tenantId: string) {
  const supabase = createPublicAdminClient();

  const [pensionResult, publicSiteResult, appearanceSaved] = await Promise.all([
    supabase
      .from("pension_settings")
      .select("admin_palette_key, contact_email")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    supabase
      .from("public_site_settings")
      .select("contact, use_primary_contact")
      .eq("tenant_id", tenantId)
      .maybeSingle(),
    hasAppearanceBeenSaved(tenantId),
  ]);

  const pensionRow = pensionResult.data;
  const publicSiteRow = publicSiteResult.data;
  const publicContact =
    publicSiteRow?.contact && typeof publicSiteRow.contact === "object"
      ? (publicSiteRow.contact as { email?: string | null })
      : null;

  return {
    rawPaletteKey:
      typeof pensionRow?.admin_palette_key === "string"
        ? pensionRow.admin_palette_key
        : null,
    appearanceSaved,
    pensionEmail:
      typeof pensionRow?.contact_email === "string" ? pensionRow.contact_email : null,
    publicSiteEmail:
      typeof publicContact?.email === "string" ? publicContact.email : null,
    usePrimaryContact: publicSiteRow?.use_primary_contact !== false,
  };
}

async function resolveSetupIssuesUncached(
  opts: ResolveSetupIssuesOpts
): Promise<SetupIssue[]> {
  const supabase = await createClient();
  const tenantId = await resolveTenantIdForData();

  const [{ data: factors }, onboardingContext, buildings] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    loadOnboardingIssueContext(tenantId),
    listBuildings().catch(() => []),
  ]);

  const issues: SetupIssue[] = [];

  const mfaIssue = resolveMfaSetupIssue({ ...opts, factors });
  if (mfaIssue) issues.push(mfaIssue);

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

  return issues;
}

const loadSetupIssues = cache(
  (email: string, memberRole: string) =>
    resolveSetupIssuesUncached({
      email: email || null,
      memberRole: (memberRole || null) as TenantMemberRole | null,
    })
);

/** Single source of truth for unresolved admin setup / security issues. */
export async function resolveSetupIssues(
  opts: ResolveSetupIssuesOpts
): Promise<SetupIssue[]> {
  return loadSetupIssues(opts.email ?? "", opts.memberRole ?? "");
}

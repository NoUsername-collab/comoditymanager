import { cache } from "react";
import { resolveMfaSetupIssue } from "@/domain/setup-issues/checks";
import type { SetupIssue } from "@/domain/setup-issues/types";
import { createClient } from "@/lib/supabase/server";
import type { TenantMemberRole } from "@/services/tenant-members";

export type ResolveSetupIssuesOpts = {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
};

async function resolveSetupIssuesUncached(
  opts: ResolveSetupIssuesOpts
): Promise<SetupIssue[]> {
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();

  const issues: SetupIssue[] = [];

  const mfaIssue = resolveMfaSetupIssue({ ...opts, factors });
  if (mfaIssue) issues.push(mfaIssue);

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

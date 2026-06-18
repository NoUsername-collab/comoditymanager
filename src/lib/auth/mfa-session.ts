import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasVerifiedTotpFactor,
  isMfaMandatoryForUser,
} from "@/lib/auth/mfa-policy";
import type { TenantMemberRole } from "@/services/tenant-members";

export type MfaAccessState =
  | { kind: "ok" }
  | { kind: "needs_enrollment" }
  | { kind: "needs_challenge" };

export async function getMfaAccessState(
  supabase: SupabaseClient,
  opts: {
    email?: string | null;
    memberRole?: TenantMemberRole | null;
  }
): Promise<MfaAccessState> {
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aal) {
    return { kind: "ok" };
  }

  if (aal.currentLevel === "aal2" && aal.nextLevel === "aal2") {
    return { kind: "ok" };
  }

  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return { kind: "ok" };
  }

  const enrolled = hasVerifiedTotpFactor(factors);
  const mandatory = isMfaMandatoryForUser(opts);

  if (mandatory && !enrolled) {
    return { kind: "needs_enrollment" };
  }

  if (enrolled && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
    return { kind: "needs_challenge" };
  }

  return { kind: "ok" };
}

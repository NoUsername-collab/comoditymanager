import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import {
  hasVerifiedTotpFactor,
  isMfaRecommendedForUser,
} from "@/lib/auth/mfa-policy";
import type { TenantMemberRole } from "@/services/tenant-members";
import { SETUP_ISSUE_IDS, type SetupIssue } from "./types";

export function resolveMfaSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  factors: { totp?: Array<{ status?: string }> } | null | undefined;
}): SetupIssue | null {
  if (!isMfaRecommendedForUser({ email: opts.email, memberRole: opts.memberRole })) {
    return null;
  }

  if (hasVerifiedTotpFactor(opts.factors)) {
    return null;
  }

  return {
    id: SETUP_ISSUE_IDS.MFA_NOT_ENABLED,
    severity: "warning",
    settingsPath: MFA_SETUP_PATH,
    labelKey: "mfaNotEnabled",
  };
}

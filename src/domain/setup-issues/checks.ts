import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import {
  hasVerifiedTotpFactor,
  isMfaRecommendedForUser,
} from "@/lib/auth/mfa-policy";
import { isPlatformAdminEmail } from "@/lib/auth/require-platform-admin";
import type { TenantMemberRole } from "@/domain/tenant/types";
import { ONBOARDING_PATH } from "@/domain/onboarding/steps";
import { SETUP_ISSUE_IDS, type SetupIssue } from "./types";

export const IDENTITY_SETTINGS_PATH = "/admin/settings/identity";

export function canReceiveOnboardingSetupIssues(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
}): boolean {
  if (opts.email && isPlatformAdminEmail(opts.email)) return true;
  return opts.memberRole === "owner" || opts.memberRole === "admin";
}

/** Skip MFA/DB work on admin layout when no issue type applies to this user. */
export function shouldResolveSetupIssues(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
}): boolean {
  return (
    isMfaRecommendedForUser(opts) || canReceiveOnboardingSetupIssues(opts)
  );
}

export function hasConfiguredContactEmail(opts: {
  pensionEmail: string | null | undefined;
  publicSiteEmail: string | null | undefined;
  usePrimaryContact: boolean;
}): boolean {
  if (opts.pensionEmail?.trim()) return true;
  if (!opts.usePrimaryContact && opts.publicSiteEmail?.trim()) return true;
  return false;
}

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

export function resolveContactEmailSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  pensionEmail: string | null | undefined;
  publicSiteEmail: string | null | undefined;
  usePrimaryContact: boolean;
}): SetupIssue | null {
  if (!canReceiveOnboardingSetupIssues(opts)) return null;

  if (
    hasConfiguredContactEmail({
      pensionEmail: opts.pensionEmail,
      publicSiteEmail: opts.publicSiteEmail,
      usePrimaryContact: opts.usePrimaryContact,
    })
  ) {
    return null;
  }

  return {
    id: SETUP_ISSUE_IDS.CONTACT_EMAIL_MISSING,
    severity: "warning",
    settingsPath: IDENTITY_SETTINGS_PATH,
    labelKey: "contactEmailMissing",
  };
}

export function resolveRoomsMissingSetupIssue(opts: {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
  roomCount: number;
}): SetupIssue | null {
  if (!canReceiveOnboardingSetupIssues(opts)) return null;
  if (opts.roomCount >= 1) return null;

  return {
    id: SETUP_ISSUE_IDS.ROOMS_MISSING,
    severity: "warning",
    settingsPath: ONBOARDING_PATH,
    labelKey: "roomsMissing",
  };
}
